import { z } from "zod";
import { BestMCP, Param, Tool } from "../src/index.js";

// 示例服务类
class MathService {
  @Tool("计算两个数字的和")
  async add(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): Promise<number> {
    return a + b;
  }

  @Tool("计算两个数字的乘积")
  async multiply(
    @Param(z.number(), "第一个数字") a: number,
    @Param(z.number(), "第二个数字") b: number,
  ): Promise<number> {
    return a * b;
  }

  @Tool("问候用户")
  async greet(
    @Param(z.string(), "用户名") name: string,
    @Param(z.string().optional(), "问候语言") language: string = "中文",
  ): Promise<string> {
    const greetings = {
      中文: `你好, ${name}!`,
      英文: `Hello, ${name}!`,
      日文: `こんにちは, ${name}!`,
    };
    return greetings[language as keyof typeof greetings] || greetings["中文"];
  }
}

// 创建 MCP 服务器实例
const mcp = new BestMCP("math-service", "1.0.0");

// 注册服务
mcp.register(MathService);

// 启动 HTTP 服务器
async function startHTTPServer() {
  try {
    console.log("正在启动 HTTP MCP 服务器...");
    await mcp.run({
      transport: "http",
      port: 3000,
      host: "127.0.0.1",
    });

    console.log("HTTP MCP 服务器已启动在 http://127.0.0.1:3000/mcp");
    console.log("可以使用以下命令测试:");
    console.log("curl -X POST http://127.0.0.1:3000/mcp \\");
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}\'');
  } catch (error) {
    console.error("启动 HTTP 服务器失败:", error);
    process.exit(1);
  }
}

// 启动服务器
startHTTPServer();
