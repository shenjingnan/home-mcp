import { BestMCP, Tool, Param } from '../src/index.js';
import { z } from 'zod';

// 示例服务类
class TextService {
  @Tool("将文本转换为大写")
  async toUpperCase(
    @Param(z.string(), "输入文本") text: string
  ): Promise<string> {
    return text.toUpperCase();
  }

  @Tool("计算文本长度")
  async calculateLength(
    @Param(z.string(), "输入文本") text: string
  ): Promise<number> {
    return text.length;
  }

  @Tool("反转文本")
  async reverseText(
    @Param(z.string(), "输入文本") text: string
  ): Promise<string> {
    return text.split('').reverse().join('');
  }
}

// 创建 MCP 服务器实例
const mcp = new BestMCP("text-service", "1.0.0");

// 注册服务
mcp.register(TextService);

// 启动 stdio 服务器（默认方式）
async function startStdioServer() {
  try {
    console.log('正在启动 stdio MCP 服务器...');
    await mcp.run(); // 默认使用 stdio 传输
  } catch (error) {
    console.error('启动 stdio 服务器失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startStdioServer();