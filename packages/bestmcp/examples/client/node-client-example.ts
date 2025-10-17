/**
 * Node.js 环境下的 BestMCP HTTP 客户端示例
 *
 * 本示例展示如何在 Node.js 环境中与 HTTP 传输层的 BestMCP 服务器交互
 * 包括命令行工具、批量操作、错误处理等功能
 */

import { createInterface } from "node:readline";
import { program } from "commander";

// JSON Schema 类型定义
interface JsonSchema {
  type: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  default?: unknown;
}

// MCP 响应类型定义
interface MCPResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface ToolInfo {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, JsonSchema>;
    required: string[];
  };
}

// Node.js HTTP 客户端类
class NodeMCPHttpClient {
  private baseUrl: string;
  private requestId: number = 1;
  private userAgent: string;

  constructor(baseUrl: string, userAgent: string = "node-bestmcp-client/1.0.0") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.userAgent = userAgent;
  }

  /**
   * 调用 MCP 工具
   */
  async callTool(toolName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const payload = {
      jsonrpc: "2.0",
      id: this.requestId++,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await this.makeRequest(payload);

    if (response.error) {
      throw new Error(`工具调用失败 [${toolName}]: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * 获取可用工具列表
   */
  async listTools(): Promise<ToolInfo[]> {
    const payload = {
      jsonrpc: "2.0",
      id: this.requestId++,
      method: "tools/list",
    };

    const response = await this.makeRequest(payload);

    if (response.error) {
      throw new Error(`获取工具列表失败: ${response.error.message}`);
    }

    return response.result.tools;
  }

  /**
   * 发送 HTTP 请求
   */
  private async makeRequest(payload: Record<string, unknown>): Promise<MCPResponse> {
    const url = `${this.baseUrl}/mcp`;

    try {
      // Node.js 18+ 可以使用全局 fetch
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.userAgent,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as MCPResponse;

      if (data.jsonrpc !== "2.0") {
        throw new Error("无效的 JSON-RPC 响应");
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`请求失败: ${error.message}`);
      }
      throw new Error("未知请求错误");
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listTools();
      return true;
    } catch (error) {
      console.error("连接测试失败:", error);
      return false;
    }
  }

  /**
   * 获取服务器信息
   */
  async getServerInfo(): Promise<{ url: string; connected: boolean; tools: number }> {
    const connected = await this.testConnection();
    const tools = connected ? await this.listTools() : [];

    return {
      url: this.baseUrl,
      connected,
      tools: tools.length,
    };
  }
}

// 性能测试类
class PerformanceTester {
  constructor(private client: NodeMCPHttpClient) {}

  /**
   * 并发性能测试
   */
  async runConcurrentTest(
    toolName: string,
    args: Record<string, unknown>,
    concurrency: number,
    totalRequests: number,
  ): Promise<{
    toolName: string;
    totalRequests: number;
    concurrency: number;
    successCount: number;
    errorCount: number;
    duration: number;
    avgTime: number;
    throughput: number;
    errors: string[];
  }> {
    console.log(`🚀 开始并发测试: ${toolName}`);
    console.log(`   总请求数: ${totalRequests}, 并发数: ${concurrency}`);

    const startTime = Date.now();
    const results: { success: boolean; result?: unknown; error?: string; duration: number }[] = [];
    const errors: string[] = [];

    // 分批执行
    for (let i = 0; i < totalRequests; i += concurrency) {
      const batch = [];
      const batchSize = Math.min(concurrency, totalRequests - i);

      for (let j = 0; j < batchSize; j++) {
        const batchStartTime = Date.now();

        batch.push(
          this.client
            .callTool(toolName, args)
            .then((result) => ({
              success: true,
              result,
              duration: Date.now() - batchStartTime,
            }))
            .catch((error) => ({
              success: false,
              error: error.message,
              duration: Date.now() - batchStartTime,
            })),
        );
      }

      const batchResults = await Promise.all(batch);
      results.push(...batchResults);

      // 收集错误
      batchResults.forEach((result) => {
        if (!result.success && result.error) {
          errors.push(result.error);
        }
      });

      // 显示进度
      const progress = Math.min(i + batchSize, totalRequests);
      console.log(`   进度: ${progress}/${totalRequests} (${Math.round((progress / totalRequests) * 100)}%)`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.length - successCount;
    const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const throughput = successCount / (duration / 1000);

    return {
      toolName,
      totalRequests,
      concurrency,
      successCount,
      errorCount,
      duration,
      avgTime,
      throughput,
      errors: [...new Set(errors)], // 去重
    };
  }

  /**
   * 负载测试
   */
  async runLoadTest(
    toolName: string,
    args: Record<string, unknown>,
    duration: number,
    maxConcurrency: number = 10,
  ): Promise<{
    toolName: string;
    duration: number;
    maxConcurrency: number;
    totalRequests: number;
    successCount: number;
    errorCount: number;
    throughput: number;
    avgResponseTime: number;
    p95ResponseTime: number;
  }> {
    console.log(`⚡ 开始负载测试: ${toolName}`);
    console.log(`   持续时间: ${duration}s, 最大并发数: ${maxConcurrency}`);

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const results: { duration: number; success: boolean }[] = [];
    let activeRequests = 0;
    let totalRequests = 0;

    const runRequest = async (): Promise<void> => {
      const requestStartTime = Date.now();
      activeRequests++;
      totalRequests++;

      try {
        await this.client.callTool(toolName, args);
        results.push({
          duration: Date.now() - requestStartTime,
          success: true,
        });
      } catch (_error) {
        results.push({
          duration: Date.now() - requestStartTime,
          success: false,
        });
      } finally {
        activeRequests--;
      }
    };

    // 持续发送请求
    const scheduleRequest = async (): Promise<void> => {
      while (Date.now() < endTime) {
        if (activeRequests < maxConcurrency) {
          // 不等待，立即发送新请求
          runRequest();
        }
        // 短暂延迟避免过度占用 CPU
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };

    // 启动多个调度器
    const schedulers = [];
    for (let i = 0; i < maxConcurrency; i++) {
      schedulers.push(scheduleRequest());
    }

    await Promise.all(schedulers);

    // 等待所有请求完成
    while (activeRequests > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.length - successCount;
    const actualDuration = Date.now() - startTime;
    const throughput = successCount / (actualDuration / 1000);

    // 计算响应时间统计
    const responseTimes = results.map((r) => r.duration).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95ResponseTime = responseTimes[p95Index] || 0;

    return {
      toolName,
      duration: actualDuration,
      maxConcurrency,
      totalRequests,
      successCount,
      errorCount,
      throughput,
      avgResponseTime,
      p95ResponseTime,
    };
  }
}

// 交互式命令行界面
class InteractiveCLI {
  private client: NodeMCPHttpClient;
  private rl: ReturnType<typeof createInterface>;
  private tools: ToolInfo[] = [];

  constructor(client: NodeMCPHttpClient) {
    this.client = client;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start() {
    console.log("🎯 BestMCP 交互式客户端");
    console.log('输入 "help" 查看可用命令，输入 "exit" 退出');
    console.log("");

    await this.loadTools();

    while (true) {
      const input = await this.question("> ");
      const command = input.trim().toLowerCase();

      try {
        if (command === "exit" || command === "quit") {
          break;
        } else if (command === "help") {
          this.showHelp();
        } else if (command === "tools") {
          this.showTools();
        } else if (command === "status") {
          await this.showStatus();
        } else if (command.startsWith("call ")) {
          await this.handleCall(command);
        } else if (command.startsWith("perf ")) {
          await this.handlePerformance(command);
        } else if (command === "clear") {
          console.clear();
        } else {
          console.log('❌ 未知命令。输入 "help" 查看可用命令。');
        }
      } catch (error) {
        console.error("❌ 错误:", error.message);
      }

      console.log("");
    }

    this.rl.close();
    console.log("👋 再见！");
  }

  private async question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  private async loadTools() {
    try {
      this.tools = await this.client.listTools();
      console.log(`✅ 已连接，加载了 ${this.tools.length} 个工具`);
    } catch (error) {
      console.log(`❌ 加载工具失败: ${error.message}`);
    }
  }

  private showHelp() {
    console.log("可用命令:");
    console.log("  help              - 显示此帮助信息");
    console.log("  tools             - 显示可用工具列表");
    console.log("  status            - 显示服务器状态");
    console.log("  call <tool>       - 调用工具（使用 JSON 参数）");
    console.log("  perf <tool>       - 对工具进行性能测试");
    console.log("  clear             - 清空屏幕");
    console.log("  exit, quit        - 退出程序");
    console.log("");
    console.log("示例:");
    console.log('  call add {"a": 5, "b": 3}');
    console.log("  perf add 10 5     - 对 add 工具进行 10 次请求，并发数 5");
  }

  private showTools() {
    if (this.tools.length === 0) {
      console.log("❌ 没有可用工具");
      return;
    }

    console.log("📋 可用工具:");
    this.tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}`);
      console.log(`     描述: ${tool.description}`);
      if (tool.inputSchema.properties) {
        const params = Object.keys(tool.inputSchema.properties);
        if (params.length > 0) {
          console.log(`     参数: ${params.join(", ")}`);
        }
      }
      console.log("");
    });
  }

  private async showStatus() {
    const info = await this.client.getServerInfo();
    console.log("📊 服务器状态:");
    console.log(`   URL: ${info.url}`);
    console.log(`   连接状态: ${info.connected ? "✅ 已连接" : "❌ 未连接"}`);
    console.log(`   可用工具: ${info.tools} 个`);
  }

  private async handleCall(command: string) {
    const parts = command.substring(5).trim().split(" ");
    if (parts.length === 0) {
      console.log("❌ 请指定工具名称");
      return;
    }

    const toolName = parts[0];
    let argsText = parts.slice(1).join(" ");

    if (!argsText) {
      argsText = await this.question("请输入参数 (JSON): ");
    }

    try {
      const args = argsText ? JSON.parse(argsText) : {};
      const result = await this.client.callTool(toolName, args);
      console.log("✅ 调用成功:");
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.log(`❌ 调用失败: ${error.message}`);
    }
  }

  private async handlePerformance(command: string) {
    const parts = command.substring(5).trim().split(" ");
    if (parts.length < 2) {
      console.log("❌ 用法: perf <tool> <requests> [concurrency]");
      console.log("   示例: perf add 100 10");
      return;
    }

    const toolName = parts[0];
    const requests = parseInt(parts[1], 10);
    const concurrency = parts.length > 2 ? parseInt(parts[2], 10) : 5;

    // 获取工具的默认参数
    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      console.log(`❌ 工具 "${toolName}" 不存在`);
      return;
    }

    const args: Record<string, unknown> = {};
    if (tool.inputSchema.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([key, schema]: [string, JsonSchema]) => {
        if (schema.default !== undefined) {
          args[key] = schema.default;
        } else if (schema.type === "number") {
          args[key] = Math.floor(Math.random() * 100);
        } else if (schema.type === "string") {
          args[key] = "test";
        }
      });
    }

    const tester = new PerformanceTester(this.client);
    const result = await tester.runConcurrentTest(toolName, args, concurrency, requests);

    console.log("📊 性能测试结果:");
    console.log(`   工具: ${result.toolName}`);
    console.log(`   总请求数: ${result.totalRequests}`);
    console.log(`   并发数: ${result.concurrency}`);
    console.log(`   成功数: ${result.successCount}`);
    console.log(`   失败数: ${result.errorCount}`);
    console.log(`   总耗时: ${result.duration}ms`);
    console.log(`   平均耗时: ${result.avgTime.toFixed(2)}ms`);
    console.log(`   吞吐量: ${result.throughput.toFixed(2)} req/s`);

    if (result.errors.length > 0) {
      console.log("   错误信息:");
      result.errors.slice(0, 5).forEach((error) => {
        console.log(`     - ${error}`);
      });
      if (result.errors.length > 5) {
        console.log(`     ... 还有 ${result.errors.length - 5} 个错误`);
      }
    }
  }
}

// 命令行工具设置
program.name("bestmcp-client").description("BestMCP HTTP 客户端命令行工具").version("1.0.0");

program
  .command("interactive")
  .description("启动交互式命令行界面")
  .option("-u, --url <url>", "服务器URL", "http://127.0.0.1:3000")
  .action(async (options) => {
    const client = new NodeMCPHttpClient(options.url);
    const cli = new InteractiveCLI(client);
    await cli.start();
  });

program
  .command("call")
  .description("调用单个工具")
  .requiredOption("-t, --tool <tool>", "工具名称")
  .option("-a, --args <args>", "工具参数 (JSON)", "{}")
  .option("-u, --url <url>", "服务器URL", "http://127.0.0.1:3000")
  .action(async (options) => {
    const client = new NodeMCPHttpClient(options.url);

    try {
      const args = JSON.parse(options.args);
      const result = await client.callTool(options.tool, args);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("错误:", error.message);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("列出可用工具")
  .option("-u, --url <url>", "服务器URL", "http://127.0.0.1:3000")
  .action(async (options) => {
    const client = new NodeMCPHttpClient(options.url);

    try {
      const tools = await client.listTools();
      console.log(`发现 ${tools.length} 个工具:`);
      tools.forEach((tool) => {
        console.log(`  ${tool.name}: ${tool.description}`);
      });
    } catch (error) {
      console.error("错误:", error.message);
      process.exit(1);
    }
  });

program
  .command("perf")
  .description("性能测试")
  .requiredOption("-t, --tool <tool>", "工具名称")
  .option("-n, --requests <number>", "请求数量", "100")
  .option("-c, --concurrency <number>", "并发数", "10")
  .option("-u, --url <url>", "服务器URL", "http://127.0.0.1:3000")
  .action(async (options) => {
    const client = new NodeMCPHttpClient(options.url);
    const tester = new PerformanceTester(client);

    try {
      // 简单的默认参数
      const args: Record<string, unknown> = {};
      if (options.tool === "add" || options.tool === "multiply") {
        args.a = 10;
        args.b = 5;
      } else if (options.tool === "sqrt") {
        args.num = 25;
      }

      const result = await tester.runConcurrentTest(
        options.tool,
        args,
        parseInt(options.concurrency, 10),
        parseInt(options.requests, 10),
      );

      console.log("性能测试结果:");
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("错误:", error.message);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("检查服务器状态")
  .option("-u, --url <url>", "服务器URL", "http://127.0.0.1:3000")
  .action(async (options) => {
    const client = new NodeMCPHttpClient(options.url);

    try {
      const info = await client.getServerInfo();
      console.log("服务器状态:");
      console.log(JSON.stringify(info, null, 2));
    } catch (error) {
      console.error("错误:", error.message);
      process.exit(1);
    }
  });

// 主函数
async function main() {
  // 如果没有提供命令，显示帮助
  if (process.argv.length <= 2) {
    program.help();
  }

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error("错误:", error.message);
    process.exit(1);
  }
}

// 直接运行时的演示
async function demo() {
  console.log("🎯 BestMCP Node.js 客户端演示");
  console.log("==============================");
  console.log("");

  const client = new NodeMCPHttpClient("http://127.0.0.1:3000");

  try {
    // 测试连接
    console.log("1️⃣ 测试服务器连接...");
    const connected = await client.testConnection();
    console.log(`   连接状态: ${connected ? "✅ 成功" : "❌ 失败"}`);
    console.log("");

    if (!connected) {
      console.log("❌ 无法连接到服务器，请确保服务器在 http://127.0.0.1:3000 运行");
      return;
    }

    // 获取工具列表
    console.log("2️⃣ 获取工具列表...");
    const tools = await client.listTools();
    console.log(`   发现 ${tools.length} 个工具:`);
    tools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
    });
    console.log("");

    // 调用几个示例工具
    console.log("3️⃣ 调用示例工具...");

    if (tools.find((t) => t.name === "add")) {
      const sum = await client.callTool("add", { a: 15, b: 27 });
      console.log(`   ➕ add(15, 27) = ${sum}`);
    }

    if (tools.find((t) => t.name === "getServerStatus")) {
      const status = await client.callTool("getServerStatus", {});
      console.log(`   📊 服务器状态: ${JSON.stringify(status, null, 6).replace(/\n/g, "\n   ")}`);
    }

    console.log("");
    console.log("✅ 演示完成！");
    console.log("");
    console.log("💡 使用以下命令启动交互式客户端:");
    console.log("   npm run client:interactive");
    console.log("");
    console.log("💡 或直接使用命令行工具:");
    console.log('   node dist/client/node-client-example.js call --tool add --args \'{"a": 5, "b": 3}\'');
  } catch (error) {
    console.error("❌ 演示失败:", error.message);
  }
}

// 如果直接运行此文件，执行演示
if (require.main === module && process.argv.length === 2) {
  demo().catch(console.error);
} else {
  // 否则作为命令行工具运行
  main().catch(console.error);
}

export { NodeMCPHttpClient, PerformanceTester, InteractiveCLI };
