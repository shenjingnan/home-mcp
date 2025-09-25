#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// 环境变量配置接口
interface EnvironmentConfig {
  HASS_TOKEN: string;
  HASS_URL: string;
}

// 验证和读取环境变量
function validateEnvironment(): EnvironmentConfig {
  const hassToken = process.env['HASS_TOKEN'] ?? "";
  const hassUrl = process.env['HASS_URL'] ?? "";

  return {
    HASS_TOKEN: hassToken.trim(),
    HASS_URL: hassUrl.trim(),
  };
}

// 全局环境配置
let envConfig: EnvironmentConfig;

// 获取 Home Assistant 访问令牌
export function getHassToken(): string {
  return envConfig.HASS_TOKEN;
}

const server = new Server(
  {
    name: "home-mcp",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// 处理工具列表请求
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add",
        description: "将两个数字相加并返回结果",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "第一个数字",
            },
            b: {
              type: "number",
              description: "第二个数字",
            },
          },
          required: ["a", "b"],
        },
      },
      {
        name: "subtract",
        description: "从第一个数字中减去第二个数字并返回结果",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "被减数",
            },
            b: {
              type: "number",
              description: "减数",
            },
          },
          required: ["a", "b"],
        },
      },
    ],
  };
});

// 处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "add": {
        const { a, b } = args as { a: number; b: number };

        if (typeof a !== "number" || typeof b !== "number") {
          throw new Error("参数必须是数字");
        }

        const result = a + b;
        return {
          content: [
            {
              type: "text",
              text: `${a} + ${b} = ${result}`,
            },
          ],
        };
      }

      case "subtract": {
        const { a, b } = args as { a: number; b: number };

        if (typeof a !== "number" || typeof b !== "number") {
          throw new Error("参数必须是数字");
        }

        const result = a - b;
        return {
          content: [
            {
              type: "text",
              text: `${a} - ${b} = ${result}`,
            },
          ],
        };
      }

      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `错误: ${error instanceof Error ? error.message : "未知错误"}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  try {
    // 验证环境变量
    envConfig = validateEnvironment();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP 服务器已启动");
    console.error("Home Assistant 集成已准备就绪");
  } catch (error) {
    console.error("服务器启动失败:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});
