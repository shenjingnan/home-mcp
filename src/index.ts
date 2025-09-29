#!/usr/bin/env node

import "reflect-metadata";
import { BestMCP, param, tool } from "bestmcp";

class HassMCPServer {
  @tool({ description: "Add two numbers together" })
  addNumbers(@param() value1: number, @param('value2') value2: number): number {
    /**
     * Add two numbers together
     * @param args Object containing a and b
     * @returns The sum of a and b
     */
    return value1 + value2;
  }

  @tool({ description: "Subtract two numbers" })
  subtract(@param() a: number, @param() b: number): number {
    /**
     * Subtract the second number from the first number
     * @param args Object containing a and b
     * @returns The difference between a and b
     */
    return a - b;
  }

  @tool({ description: "Get the current time" })
  getCurrentTime(): string {
    /**
     * Get the current time in ISO format
     * @returns Current time as ISO string
     */
    return new Date().toISOString();
  }
}

// 创建 MCP 服务器实例
const mcp = new BestMCP("Home Assistant MCP Server", "1.0.0");

// 注册服务类
mcp.register(HassMCPServer);

// 启动服务器
mcp.run().catch((error: Error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

// // 环境变量配置接口
// interface EnvironmentConfig {
//   HASS_TOKEN: string;
//   HASS_URL: string;
// }

// // 验证和读取环境变量
// function validateEnvironment(): EnvironmentConfig {
//   const hassToken = process.env["HASS_TOKEN"] ?? "";
//   const hassUrl = process.env["HASS_URL"] ?? "";

//   return {
//     HASS_TOKEN: hassToken.trim(),
//     HASS_URL: hassUrl.trim(),
//   };
// }

// // 全局环境配置
// let envConfig: EnvironmentConfig;

// // 获取 Home Assistant 访问令牌
// export function getHassToken(): string {
//   return envConfig.HASS_TOKEN;
// }

// const server = new Server(
//   {
//     name: "home-mcp",
//     version: "0.0.1",
//   },
//   {
//     capabilities: {
//       tools: {},
//     },
//   },
// );

// // 处理工具列表请求
// server.setRequestHandler(ListToolsRequestSchema, async () => {
//   return {
//     tools: [
//       {
//         name: "add",
//         description: "将两个数字相加并返回结果",
//         inputSchema: {
//           type: "object",
//           properties: {
//             a: {
//               type: "number",
//               description: "第一个数字",
//             },
//             b: {
//               type: "number",
//               description: "第二个数字",
//             },
//           },
//           required: ["a", "b"],
//         },
//       },
//       {
//         name: "subtract",
//         description: "从第一个数字中减去第二个数字并返回结果",
//         inputSchema: {
//           type: "object",
//           properties: {
//             a: {
//               type: "number",
//               description: "被减数",
//             },
//             b: {
//               type: "number",
//               description: "减数",
//             },
//           },
//           required: ["a", "b"],
//         },
//       },
//       {
//         name: "get_states",
//         description: "获取 Home Assistant 中所有实体的状态信息",
//         inputSchema: {
//           type: "object",
//           properties: {},
//           required: [],
//         },
//       },
//     ],
//   };
// });

// // 处理工具调用请求
// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//   const { name, arguments: args } = request.params;

//   try {
//     switch (name) {
//       case "add": {
//         const { a, b } = args as { a: number; b: number };

//         if (typeof a !== "number" || typeof b !== "number") {
//           throw new Error("参数必须是数字");
//         }

//         const result = a + b;
//         return {
//           content: [
//             {
//               type: "text",
//               text: `${a} + ${b} = ${result}`,
//             },
//           ],
//         };
//       }

//       case "subtract": {
//         const { a, b } = args as { a: number; b: number };

//         if (typeof a !== "number" || typeof b !== "number") {
//           throw new Error("参数必须是数字");
//         }

//         const result = a - b;
//         return {
//           content: [
//             {
//               type: "text",
//               text: `${a} - ${b} = ${result}`,
//             },
//           ],
//         };
//       }

//       case "get_states": {
//         if (!envConfig.HASS_TOKEN || !envConfig.HASS_URL) {
//           throw new Error("未配置 Home Assistant 凭据，请设置 HASS_TOKEN 和 HASS_URL 环境变量");
//         }

//         try {
//           const response = await fetch(`${envConfig.HASS_URL}/api/states`, {
//             method: "GET",
//             headers: {
//               Authorization: `Bearer ${envConfig.HASS_TOKEN}`,
//               "Content-Type": "application/json",
//             },
//           });

//           if (!response.ok) {
//             throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
//           }

//           const states = (await response.json()) as unknown[];

//           return {
//             content: [
//               {
//                 type: "text",
//                 text: JSON.stringify(states, null, 2),
//               },
//             ],
//           };
//         } catch (error) {
//           if (error instanceof Error) {
//             throw new Error(`获取实体状态失败: ${error.message}`);
//           }
//           throw new Error("获取实体状态时发生未知错误");
//         }
//       }

//       default:
//         throw new Error(`未知工具: ${name}`);
//     }
//   } catch (error) {
//     return {
//       content: [
//         {
//           type: "text",
//           text: `错误: ${error instanceof Error ? error.message : "未知错误"}`,
//         },
//       ],
//       isError: true,
//     };
//   }
// });

// async function main() {
//   try {
//     // 验证环境变量
//     envConfig = validateEnvironment();

//     const transport = new StdioServerTransport();
//     await server.connect(transport);
//     console.error("MCP 服务器已启动");
//     console.error("Home Assistant 集成已准备就绪");
//   } catch (error) {
//     console.error("服务器启动失败:", error);
//     process.exit(1);
//   }
// }

// main().catch((error) => {
//   console.error("服务器启动失败:", error);
//   process.exit(1);
// });
// function tool(arg0: { description: string; }): (target: HomeMCPServer, propertyKey: "addNumbers", descriptor: TypedPropertyDescriptor<(a: number, b: number) => number>) => void | TypedPropertyDescriptor<...> {
//   throw new Error("Function not implemented.");
// }
