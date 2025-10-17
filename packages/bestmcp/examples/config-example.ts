import { BestMCP, Tool, Param } from '../src/index.js';
import { z } from 'zod';
import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

// 示例服务类
class ConfigurableService {
  @Tool("获取服务器信息")
  async getServerInfo(): Promise<{
    name: string;
    version: string;
    capabilities: string[];
  }> {
    return {
      name: 'configurable-service',
      version: '1.0.0',
      capabilities: ['tools', 'logging']
    };
  }

  @Tool("执行计算")
  async calculate(
    @Param(z.number(), "第一个数字") a: number,
    @Param(z.number(), "第二个数字") b: number,
    @Param(z.enum(['add', 'subtract', 'multiply', 'divide']), "操作类型") operation: 'add' | 'subtract' | 'multiply' | 'divide'
  ): Promise<number> {
    switch (operation) {
      case 'add':
        return a + b;
      case 'subtract':
        return a - b;
      case 'multiply':
        return a * b;
      case 'divide':
        if (b === 0) throw new Error('除数不能为零');
        return a / b;
      default:
        throw new Error('不支持的操作类型');
    }
  }
}

// 定义服务器能力
const capabilities: ServerCapabilities = {
  tools: {
    listChanged: true
  },
  logging: {}
};

// 使用配置对象创建 MCP 服务器实例
const mcp = new BestMCP({
  name: 'configurable-service',
  version: '2.0.0',
  capabilities,
  instructions: '这是一个可配置的 MCP 服务，支持数学计算和服务器信息查询'
});

// 注册服务
mcp.register(ConfigurableService);

// 从环境变量读取传输层配置
const transportType = process.env.TRANSPORT_TYPE || 'stdio';
const port = parseInt(process.env.PORT || '8000');
const host = process.env.HOST || '127.0.0.1';

// 启动服务器
async function startServer() {
  try {
    console.log(`正在启动 ${transportType} MCP 服务器...`);

    await mcp.run({
      transport: transportType as 'stdio' | 'http',
      port,
      host
    });

    console.log(`服务器已启动，使用 ${transportType} 传输层`);
    if (transportType === 'http') {
      console.log(`HTTP 端点: http://${host}:${port}/mcp`);
    }

    // 显示服务器状态
    console.log('服务器状态:', mcp.getTransportStats());

  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();