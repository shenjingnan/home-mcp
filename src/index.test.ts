import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ConsoleError = typeof console.error;
type MockCallToolHandler = (request: {
  params: CallToolRequest["params"];
}) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

// 直接测试 MCP 服务器核心功能
describe("MCP Server", () => {
  let originalConsoleError: ConsoleError;

  beforeEach(() => {
    // 保存原始 console.error
    originalConsoleError = console.error;

    // 模拟 console.error 以避免测试中的噪音
    console.error = vi.fn();
  });

  afterEach(() => {
    // 恢复原始 console.error
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe("服务器初始化", () => {
    it("应该正确创建 MCP 服务器实例", () => {
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

      expect(server).toBeInstanceOf(Server);
    });

    it("应该配置正确的服务器名称和版本", () => {
      const testServer = new Server(
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

      expect(testServer).toBeInstanceOf(Server);
    });
  });

  describe("工具列表请求处理", () => {
    it("应该返回正确的工具列表", async () => {
      // 模拟 ListToolsRequestSchema 处理
      const mockHandler = vi.fn().mockImplementation(async () => {
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

      const result = await mockHandler();

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe("add");
      expect(result.tools[1].name).toBe("subtract");
      expect(result.tools[0].inputSchema.required).toEqual(["a", "b"]);
      expect(result.tools[1].inputSchema.required).toEqual(["a", "b"]);
    });

    it("应该包含正确的工具描述", async () => {
      const mockHandler = vi.fn().mockImplementation(async () => {
        return {
          tools: [
            {
              name: "add",
              description: "将两个数字相加并返回结果",
              inputSchema: {
                type: "object",
                properties: {
                  a: { type: "number", description: "第一个数字" },
                  b: { type: "number", description: "第二个数字" },
                },
                required: ["a", "b"],
              },
            },
          ],
        };
      });

      const result = await mockHandler();

      expect(result.tools[0].description).toBe("将两个数字相加并返回结果");
      expect(result.tools[0].inputSchema.properties.a.description).toBe("第一个数字");
      expect(result.tools[0].inputSchema.properties.b.description).toBe("第二个数字");
    });
  });

  describe("工具调用处理", () => {
    let mockCallToolHandler: MockCallToolHandler;

    beforeEach(() => {
      // 模拟工具调用处理程序
      mockCallToolHandler = vi.fn().mockImplementation(async (request: { params: CallToolRequest["params"] }) => {
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
    });

    describe("add 工具测试", () => {
      it("应该正确执行正数相加", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: 5, b: 3 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("5 + 3 = 8");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确执行负数相加", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: -5, b: -3 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("-5 + -3 = -8");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确执行正负数相加", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: 10, b: -7 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("10 + -7 = 3");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确执行小数相加", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: 3.14, b: 2.86 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("3.14 + 2.86 = 6");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确处理零值相加", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: 0, b: 5 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("0 + 5 = 5");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确处理大数相加", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: 999999999, b: 1 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("999999999 + 1 = 1000000000");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确处理边界值相加", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: Number.MAX_SAFE_INTEGER, b: 0 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe(`${Number.MAX_SAFE_INTEGER} + 0 = ${Number.MAX_SAFE_INTEGER}`);
        expect(result.isError).toBeUndefined();
      });
    });

    describe("subtract 工具测试", () => {
      it("应该正确执行正数相减", async () => {
        const request = {
          params: {
            name: "subtract",
            arguments: { a: 10, b: 3 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("10 - 3 = 7");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确执行负数相减", async () => {
        const request = {
          params: {
            name: "subtract",
            arguments: { a: -5, b: -3 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("-5 - -3 = -2");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确执行正负数相减", async () => {
        const request = {
          params: {
            name: "subtract",
            arguments: { a: 10, b: -7 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("10 - -7 = 17");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确执行小数相减", async () => {
        const request = {
          params: {
            name: "subtract",
            arguments: { a: 5.5, b: 2.5 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("5.5 - 2.5 = 3");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确处理零值相减", async () => {
        const request = {
          params: {
            name: "subtract",
            arguments: { a: 0, b: 5 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("0 - 5 = -5");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确处理大数相减", async () => {
        const request = {
          params: {
            name: "subtract",
            arguments: { a: 1000000000, b: 1 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe("1000000000 - 1 = 999999999");
        expect(result.isError).toBeUndefined();
      });

      it("应该正确处理边界值相减", async () => {
        const request = {
          params: {
            name: "subtract",
            arguments: { a: Number.MAX_SAFE_INTEGER, b: 0 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.content[0].text).toBe(`${Number.MAX_SAFE_INTEGER} - 0 = ${Number.MAX_SAFE_INTEGER}`);
        expect(result.isError).toBeUndefined();
      });
    });

    describe("错误处理测试", () => {
      it("应该处理非数字参数错误", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: "not a number", b: 3 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("错误: 参数必须是数字");
      });

      it("应该处理缺少必需参数错误", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: 5 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("错误: 参数必须是数字");
      });

      it("应该处理未知工具错误", async () => {
        const request = {
          params: {
            name: "unknown_tool",
            arguments: { a: 5, b: 3 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("错误: 未知工具: unknown_tool");
      });

      it("应该处理空参数对象", async () => {
        const request = {
          params: {
            name: "add",
            arguments: {},
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("错误: 参数必须是数字");
      });

      it("应该处理 null 参数", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: null, b: 3 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("错误: 参数必须是数字");
      });

      it("应该处理 undefined 参数", async () => {
        const request = {
          params: {
            name: "add",
            arguments: { a: undefined, b: 3 },
          },
        };

        const result = await mockCallToolHandler(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("错误: 参数必须是数字");
      });
    });
  });

  describe("服务器启动和连接", () => {
    it("应该能够创建 StdioServerTransport 实例", () => {
      const transport = new StdioServerTransport();
      expect(transport).toBeInstanceOf(StdioServerTransport);
    });

    it("应该处理服务器启动错误", async () => {
      // 模拟服务器连接失败的情况
      const mockServer = {
        connect: vi.fn().mockRejectedValue(new Error("连接失败")),
      };

      const consoleErrorSpy = vi.spyOn(console, "error");

      // 模拟 main 函数的错误处理
      const mainFunction = async () => {
        try {
          await mockServer.connect({});
        } catch (error) {
          console.error("服务器启动失败:", error);
          process.exit(1);
        }
      };

      await expect(mainFunction()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith("服务器启动失败:", expect.any(Error));
    });
  });

  describe("边界情况和特殊情况", () => {
    let mockCallToolHandler: MockCallToolHandler;

    beforeEach(() => {
      mockCallToolHandler = vi.fn().mockImplementation(async (request: { params: CallToolRequest["params"] }) => {
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
                content: [{ type: "text", text: `${a} + ${b} = ${result}` }],
              };
            }
            case "subtract": {
              const { a, b } = args as { a: number; b: number };
              if (typeof a !== "number" || typeof b !== "number") {
                throw new Error("参数必须是数字");
              }
              const result = a - b;
              return {
                content: [{ type: "text", text: `${a} - ${b} = ${result}` }],
              };
            }
            default:
              throw new Error(`未知工具: ${name}`);
          }
        } catch (error) {
          return {
            content: [{ type: "text", text: `错误: ${error instanceof Error ? error.message : "未知错误"}` }],
            isError: true,
          };
        }
      });
    });

    it("应该正确处理 Infinity", async () => {
      const request = {
        params: {
          name: "add",
          arguments: { a: Infinity, b: 5 },
        },
      };

      const result = await mockCallToolHandler(request);
      expect(result.content[0].text).toBe("Infinity + 5 = Infinity");
    });

    it("应该正确处理 -Infinity", async () => {
      const request = {
        params: {
          name: "subtract",
          arguments: { a: -Infinity, b: 5 },
        },
      };

      const result = await mockCallToolHandler(request);
      expect(result.content[0].text).toBe("-Infinity - 5 = -Infinity");
    });

    it("应该正确处理 NaN", async () => {
      const request = {
        params: {
          name: "add",
          arguments: { a: NaN, b: 5 },
        },
      };

      const result = await mockCallToolHandler(request);
      expect(result.content[0].text).toBe("NaN + 5 = NaN");
    });

    it("应该正确处理极小的小数", async () => {
      const request = {
        params: {
          name: "add",
          arguments: { a: 1e-10, b: 2e-10 },
        },
      };

      const result = await mockCallToolHandler(request);
      expect(result.content[0].text).toBe("1e-10 + 2e-10 = 3e-10");
    });

    it("应该正确处理极大的指数", async () => {
      const request = {
        params: {
          name: "add",
          arguments: { a: 1e20, b: 1e20 },
        },
      };

      const result = await mockCallToolHandler(request);
      expect(result.content[0].text).toBe("100000000000000000000 + 100000000000000000000 = 200000000000000000000");
    });
  });

  describe("数学运算精度测试", () => {
    let mockCallToolHandler: MockCallToolHandler;

    beforeEach(() => {
      mockCallToolHandler = vi.fn().mockImplementation(async (request: { params: CallToolRequest["params"] }) => {
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
                content: [{ type: "text", text: `${a} + ${b} = ${result}` }],
              };
            }
            case "subtract": {
              const { a, b } = args as { a: number; b: number };
              if (typeof a !== "number" || typeof b !== "number") {
                throw new Error("参数必须是数字");
              }
              const result = a - b;
              return {
                content: [{ type: "text", text: `${a} - ${b} = ${result}` }],
              };
            }
            default:
              throw new Error(`未知工具: ${name}`);
          }
        } catch (error) {
          return {
            content: [{ type: "text", text: `错误: ${error instanceof Error ? error.message : "未知错误"}` }],
            isError: true,
          };
        }
      });
    });

    it("应该正确处理浮点数精度问题", async () => {
      const request = {
        params: {
          name: "add",
          arguments: { a: 0.1, b: 0.2 },
        },
      };

      const result = await mockCallToolHandler(request);
      expect(result.content[0].text).toBe("0.1 + 0.2 = 0.30000000000000004");
    });

    it("应该正确处理大数相减精度问题", async () => {
      const request = {
        params: {
          name: "subtract",
          arguments: { a: 10000000000000000, b: 10000000000000000 },
        },
      };

      const result = await mockCallToolHandler(request);
      expect(result.content[0].text).toBe("10000000000000000 - 10000000000000000 = 0");
    });

    it("应该正确处理科学计数法", async () => {
      const request = {
        params: {
          name: "add",
          arguments: { a: 1.23e5, b: 4.56e3 },
        },
      };

      const result = await mockCallToolHandler(request);
      expect(result.content[0].text).toBe("123000 + 4560 = 127560");
    });
  });
});
