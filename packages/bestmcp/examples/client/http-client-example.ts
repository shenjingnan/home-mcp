/**
 * BestMCP HTTP 客户端示例
 *
 * 本示例展示如何与 HTTP 传输层的 BestMCP 服务器进行交互
 */

import { z } from 'zod';

// MCP 响应类型定义
interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface ToolInfo {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// HTTP 客户端类
class MCPHttpClient {
  private baseUrl: string;
  private requestId: number = 1;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // 移除末尾的斜杠
  }

  /**
   * 调用 MCP 工具
   */
  async callTool(toolName: string, arguments: any = {}): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments
      }
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
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/list'
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
  private async makeRequest(payload: any): Promise<MCPResponse> {
    const url = `${this.baseUrl}/mcp`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'bestmcp-http-client/1.0.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as MCPResponse;

      if (data.jsonrpc !== '2.0') {
        throw new Error('无效的 JSON-RPC 响应');
      }

      return data;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`请求失败: ${error.message}`);
      }
      throw new Error('未知请求错误');
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
      console.error('连接测试失败:', error);
      return false;
    }
  }
}

// 工具调用包装器类
class MCPToolWrapper {
  constructor(private client: MCPHttpClient) {}

  // 数学工具
  async add(a: number, b: number): Promise<number> {
    return await this.client.callTool('add', { a, b });
  }

  async multiply(a: number, b: number): Promise<number> {
    return await this.client.callTool('multiply', { a, b });
  }

  async sqrt(num: number): Promise<number> {
    return await this.client.callTool('sqrt', { num });
  }

  // 用户工具（如果服务器支持）
  async createUser(name: string, email: string): Promise<any> {
    return await this.client.callTool('createUser', { name, email });
  }

  async getUser(userId: string): Promise<any> {
    return await this.client.callTool('getUser', { userId });
  }

  async searchUsers(query?: string, limit: number = 10): Promise<any[]> {
    return await this.client.callTool('searchUsers', { query, limit });
  }

  // 系统工具
  async getServerStatus(): Promise<any> {
    return await this.client.callTool('getServerStatus', {});
  }

  async healthCheck(): Promise<any> {
    return await this.client.callTool('healthCheck', {});
  }
}

// 示例用法
async function demonstrateClient() {
  const SERVER_URL = 'http://127.0.0.1:3000';

  console.log('🔗 BestMCP HTTP 客户端示例');
  console.log(`📡 服务器地址: ${SERVER_URL}`);
  console.log('');

  // 创建客户端
  const client = new MCPHttpClient(SERVER_URL);
  const tools = new MCPToolWrapper(client);

  try {
    // 1. 测试连接
    console.log('1️⃣ 测试服务器连接...');
    const isConnected = await client.testConnection();
    if (!isConnected) {
      console.error('❌ 无法连接到服务器，请确保服务器正在运行');
      return;
    }
    console.log('✅ 连接成功');
    console.log('');

    // 2. 获取工具列表
    console.log('2️⃣ 获取可用工具列表...');
    const toolList = await client.listTools();
    console.log(`📋 发现 ${toolList.length} 个工具:`);
    toolList.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
    });
    console.log('');

    // 3. 调用数学工具
    console.log('3️⃣ 调用数学工具...');

    try {
      const sum = await tools.add(15, 27);
      console.log(`   ➕ 15 + 27 = ${sum}`);

      const product = await tools.multiply(8, 6);
      console.log(`   ✖️ 8 × 6 = ${product}`);

      const squareRoot = await tools.sqrt(144);
      console.log(`   √144 = ${squareRoot}`);
    } catch (error) {
      console.log('   ⚠️ 数学工具不可用或调用失败');
    }
    console.log('');

    // 4. 调用系统工具
    console.log('4️⃣ 调用系统工具...');

    try {
      const status = await tools.getServerStatus();
      console.log('   📊 服务器状态:');
      console.log(`      - 状态: ${status.status}`);
      console.log(`      - 运行时间: ${Math.floor(status.uptime)} 秒`);
      console.log(`      - 内存使用: ${Math.round(status.memory.heapUsed / 1024 / 1024)} MB`);
      if (status.userCount !== undefined) {
        console.log(`      - 用户数量: ${status.userCount}`);
      }
      if (status.postCount !== undefined) {
        console.log(`      - 文章数量: ${status.postCount}`);
      }
    } catch (error) {
      console.log('   ⚠️ 系统工具不可用或调用失败');
    }
    console.log('');

    // 5. 调用健康检查
    console.log('5️⃣ 健康检查...');

    try {
      const health = await tools.healthCheck();
      console.log(`   🏥 健康状态: ${health.status}`);
      if (health.checks) {
        Object.entries(health.checks).forEach(([check, result]) => {
          console.log(`      - ${check}: ${result}`);
        });
      }
    } catch (error) {
      console.log('   ⚠️ 健康检查工具不可用');
    }
    console.log('');

    // 6. 尝试用户管理功能（如果可用）
    console.log('6️⃣ 尝试用户管理功能...');

    try {
      // 创建用户
      const newUser = await tools.createUser('测试用户', 'test@example.com');
      console.log(`   👤 创建用户: ${newUser.name} (${newUser.email})`);

      // 搜索用户
      const users = await tools.searchUsers('测试', 5);
      console.log(`   🔍 搜索到 ${users.length} 个用户`);

      // 获取用户详情
      if (newUser && newUser.id) {
        const userDetails = await tools.getUser(newUser.id);
        console.log(`   📄 用户详情: ${userDetails.name}`);
      }
    } catch (error) {
      console.log('   ⚠️ 用户管理工具不可用');
    }
    console.log('');

    console.log('✅ 客户端演示完成');

  } catch (error) {
    console.error('❌ 客户端演示失败:', error);
  }
}

// 高级用法示例：批量操作
async function demonstrateBatchOperations() {
  const SERVER_URL = 'http://127.0.0.1:3000';
  const client = new MCPHttpClient(SERVER_URL);

  console.log('🔄 批量操作示例');
  console.log('');

  try {
    // 并发调用多个工具
    console.log('🚀 并发执行多个数学计算...');
    const startTime = Date.now();

    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(client.callTool('add', { a: i, b: i + 1 }));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();

    console.log(`   ✅ 完成 ${results.length} 次计算，耗时 ${endTime - startTime}ms`);
    console.log(`   📊 结果: ${results.join(', ')}`);
    console.log('');

  } catch (error) {
    console.error('❌ 批量操作失败:', error);
  }
}

// 错误处理示例
async function demonstrateErrorHandling() {
  const SERVER_URL = 'http://127.0.0.1:3000';
  const client = new MCPHttpClient(SERVER_URL);

  console.log('⚠️ 错误处理示例');
  console.log('');

  try {
    // 1. 调用不存在的工具
    console.log('1️⃣ 调用不存在的工具...');
    try {
      await client.callTool('nonexistentTool', {});
    } catch (error) {
      console.log(`   ✅ 正确捕获错误: ${error.message}`);
    }

    // 2. 传递无效参数
    console.log('2️⃣ 传递无效参数...');
    try {
      await client.callTool('add', { a: 'invalid', b: 2 });
    } catch (error) {
      console.log(`   ✅ 正确捕获参数错误: ${error.message}`);
    }

    // 3. 连接到不存在的服务器
    console.log('3️⃣ 连接到不存在的服务器...');
    const badClient = new MCPHttpClient('http://127.0.0.1:9999');
    const isConnected = await badClient.testConnection();
    console.log(`   ✅ 连接测试结果: ${isConnected ? '成功' : '失败（符合预期）'}`);

  } catch (error) {
    console.error('❌ 错误处理示例失败:', error);
  }
}

// 主函数
async function main() {
  console.log('🎯 BestMCP HTTP 客户端演示程序');
  console.log('=====================================');
  console.log('');

  // 基本功能演示
  await demonstrateClient();

  console.log('=====================================');
  console.log('');

  // 批量操作演示
  await demonstrateBatchOperations();

  console.log('=====================================');
  console.log('');

  // 错误处理演示
  await demonstrateErrorHandling();

  console.log('=====================================');
  console.log('🎉 所有演示完成');
  console.log('');
  console.log('💡 提示:');
  console.log('   1. 确保服务器在 http://127.0.0.1:3000 运行');
  console.log('   2. 可以修改 SERVER_URL 连接到其他服务器');
  console.log('   3. 查看 MCPToolWrapper 类了解工具使用方法');
}

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

export { MCPHttpClient, MCPToolWrapper };