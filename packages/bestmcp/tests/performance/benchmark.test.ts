import { beforeEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { z } from "zod";
import { Param, Tool } from "../../src/core/decorators.js";
import { BestMCP } from "../../src/core/server.js";

// Mock console methods to avoid noise in tests
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

// 临时简化的 applyTestMocks 函数，避免导入问题
function applyTestMocks(
  mcp: BestMCP,
  vi: { spyOn: (obj: unknown, method: string) => unknown },
  _config: Record<string, unknown> = {},
): Record<string, unknown> {
  const mocks: Record<string, unknown> = {};

  // Mock setupToolRequestHandlers
  // @ts-expect-error - 访问私有方法进行测试
  mocks.setupToolHandlersSpy = vi.spyOn(mcp, "setupToolRequestHandlers").mockImplementation(() => {});

  // Mock initializeTransport 并确保它正确设置传输层
  // @ts-expect-error - 访问私有方法进行测试
  mocks.initializeTransportSpy = vi
    .spyOn(mcp, "initializeTransport")
    .mockImplementation(async (transportType: string, _options: Record<string, unknown>) => {
      // 创建一个简单的 mock 传输层
      // @ts-expect-error - 访问私有属性进行测试
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mcp as any).currentTransport = {
        type: transportType,
        getStatus: () => ({ isRunning: false, type: transportType }),
        createTransport: async () => ({}),
        start: async () => {},
        stop: async () => {},
      };
      return Promise.resolve();
    });

  // Mock startHTTPServer
  // @ts-expect-error - 访问私有方法进行测试
  mocks.startHTTPServerSpy = vi.spyOn(mcp, "startHTTPServer").mockResolvedValue(undefined);

  // Mock transportManager.startCurrentTransport 以避免 "未设置当前传输层" 错误
  // @ts-expect-error - 访问私有属性进行测试
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((mcp as any).transportManager) {
    // @ts-expect-error - 访问私有方法进行测试
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn((mcp as any).transportManager, "startCurrentTransport").mockImplementation(async () => {
      // 模拟成功启动
      return Promise.resolve();
    });

    // @ts-expect-error - 访问私有方法进行测试
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn((mcp as any).transportManager, "getCurrentTransportStatus").mockReturnValue({
      type: "stdio",
      isRunning: true,
    });
  }

  return mocks;
}

// 性能测试服务类
class MathService {
  @Tool("快速加法")
  add(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): number {
    return a + b;
  }

  @Tool("快速乘法")
  multiply(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): number {
    return a * b;
  }

  @Tool("斐波那契数列")
  fibonacci(@Param(z.number(), "位置") n: number): number {
    if (n <= 1) return n;
    let a = 0,
      b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }
}

class TextService {
  @Tool("字符串拼接")
  concat(@Param(z.string(), "字符串1") a: string, @Param(z.string(), "字符串2") b: string): string {
    return a + b;
  }

  @Tool("字符串反转")
  reverse(@Param(z.string(), "输入字符串") text: string): string {
    return text.split("").reverse().join("");
  }

  @Tool("计算文本哈希")
  hash(@Param(z.string(), "输入文本") text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash;
  }
}

describe("性能基准测试", () => {
  let mcp: BestMCP;

  beforeEach(() => {
    mcp = new BestMCP({
      name: "performance-test",
      version: "1.0.0",
    });
    mcp.register(MathService);
    mcp.register(TextService);
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  describe("工具执行性能", () => {
    const ITERATION_COUNT = 1000;

    it("应该能快速执行数学运算工具", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      const startTime = performance.now();

      for (let i = 0; i < ITERATION_COUNT; i++) {
        await mcp.executeTool("add", { a: i, b: i + 1 });
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / ITERATION_COUNT;

      // 平均每次执行时间应该小于 5ms
      expect(averageTime).toBeLessThan(5);
      console.log(`平均工具执行时间: ${averageTime.toFixed(2)}ms (${ITERATION_COUNT} 次执行)`);
    });

    it("应该能快速执行字符串操作工具", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      const startTime = performance.now();
      const testStrings = Array.from({ length: ITERATION_COUNT }, (_, i) => `test-string-${i}`);

      for (const str of testStrings) {
        await mcp.executeTool("reverse", { text: str });
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / ITERATION_COUNT;

      // 平均每次执行时间应该小于 3ms
      expect(averageTime).toBeLessThan(3);
      console.log(`平均字符串操作时间: ${averageTime.toFixed(2)}ms (${ITERATION_COUNT} 次执行)`);
    });

    it("应该能处理复杂计算工具", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      const startTime = performance.now();

      // 测试斐波那契数列计算（相对较重的操作）
      for (let i = 0; i < 100; i++) {
        // 减少迭代次数因为计算较重
        await mcp.executeTool("fibonacci", { n: 20 });
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / 100;

      // 平均每次执行时间应该小于 10ms（考虑到计算复杂度）
      expect(averageTime).toBeLessThan(10);
      console.log(`平均复杂计算时间: ${averageTime.toFixed(2)}ms (100 次斐波那契计算)`);
    });
  });

  describe("传输层切换性能", () => {
    it("应该能快速切换传输层", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      const SWITCH_COUNT = 50;
      const startTime = performance.now();

      for (let i = 0; i < SWITCH_COUNT; i++) {
        if (i % 2 === 0) {
          await mcp.run({ transport: "stdio" });
        } else {
          await mcp.run({ transport: "http", port: 3000 });
        }
      }

      const endTime = performance.now();
      const averageSwitchTime = (endTime - startTime) / SWITCH_COUNT;

      // 平均切换时间应该小于 10ms
      expect(averageSwitchTime).toBeLessThan(10);
      console.log(`平均传输层切换时间: ${averageSwitchTime.toFixed(2)}ms (${SWITCH_COUNT} 次切换)`);
    });
  });

  describe("工具注册性能", () => {
    it("应该能快速注册大量工具", async () => {
      const startTime = performance.now();

      // 创建足够多的不同工具以测试注册性能
      class BulkService {
        @Tool("批量工具1")
        method1(@Param(z.string(), "参数") param: string): string {
          return `result-1-${param}`;
        }

        @Tool("批量工具2")
        method2(@Param(z.string(), "参数") param: string): string {
          return `result-2-${param}`;
        }

        @Tool("批量工具3")
        method3(@Param(z.string(), "参数") param: string): string {
          return `result-3-${param}`;
        }

        @Tool("批量工具4")
        method4(@Param(z.string(), "参数") param: string): string {
          return `result-4-${param}`;
        }

        @Tool("批量工具5")
        method5(@Param(z.string(), "参数") param: string): string {
          return `result-5-${param}`;
        }

        @Tool("批量工具6")
        method6(@Param(z.string(), "参数") param: string): string {
          return `result-6-${param}`;
        }

        @Tool("批量工具7")
        method7(@Param(z.string(), "参数") param: string): string {
          return `result-7-${param}`;
        }

        @Tool("批量工具8")
        method8(@Param(z.string(), "参数") param: string): string {
          return `result-8-${param}`;
        }

        @Tool("批量工具9")
        method9(@Param(z.string(), "参数") param: string): string {
          return `result-9-${param}`;
        }

        @Tool("批量工具10")
        method10(@Param(z.string(), "参数") param: string): string {
          return `result-10-${param}`;
        }
      }

      class AdditionalService {
        @Tool("额外工具1")
        extraMethod1(@Param(z.string(), "参数") param: string): string {
          return `extra-1-${param}`;
        }

        @Tool("额外工具2")
        extraMethod2(@Param(z.string(), "参数") param: string): string {
          return `extra-2-${param}`;
        }

        @Tool("额外工具3")
        extraMethod3(@Param(z.string(), "参数") param: string): string {
          return `extra-3-${param}`;
        }
      }

      const services = [BulkService, AdditionalService];

      // 注册所有服务
      for (const service of services) {
        mcp.register(service);
      }

      const endTime = performance.now();
      const registrationTime = endTime - startTime;

      // 注册时间应该小于 100ms
      expect(registrationTime).toBeLessThan(100);
      console.log(`工具注册时间: ${registrationTime.toFixed(2)}ms (13 个工具)`);

      // 验证工具数量
      const toolCount = mcp.getToolStats().totalTools;
      expect(toolCount).toBeGreaterThan(15); // 包括默认的工具 (13 + 2个MathService + 3个TextService = 18)
    });
  });

  describe("内存使用稳定性", () => {
    it("应该在长时间运行下保持内存稳定", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      // 模拟长时间运行
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        await mcp.executeTool("add", { a: i, b: i + 1 });
        await mcp.executeTool("concat", { a: "test", b: `-${i}` });

        // 每100次迭代强制垃圾回收（如果可用）
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePerOperation = memoryIncrease / 2000; // 2000 次操作

      // 内存增长应该合理（每个操作增长小于 5KB）
      expect(memoryIncreasePerOperation).toBeLessThan(5120);
      console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (2000 次操作)`);
    });
  });

  describe("并发性能", () => {
    it("应该能处理并发工具执行", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      const CONCURRENT_COUNT = 50;
      const startTime = performance.now();

      // 创建并发任务
      const promises = [];
      for (let i = 0; i < CONCURRENT_COUNT; i++) {
        promises.push(mcp.executeTool("add", { a: i, b: i + 1 }));
        promises.push(mcp.executeTool("multiply", { a: i, b: 2 }));
        promises.push(mcp.executeTool("reverse", { text: `string-${i}` }));
      }

      // 等待所有任务完成
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / (CONCURRENT_COUNT * 3);

      // 并发执行应该仍然保持合理的性能
      expect(averageTime).toBeLessThan(10);
      expect(results).toHaveLength(CONCURRENT_COUNT * 3);

      console.log(`并发执行时间: ${totalTime.toFixed(2)}ms (${CONCURRENT_COUNT * 3} 个并发操作)`);
      console.log(`平均并发操作时间: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe("工具验证性能", () => {
    it("应该能快速验证工具参数", async () => {
      const VALIDATION_COUNT = 1000;
      const startTime = performance.now();

      for (let i = 0; i < VALIDATION_COUNT; i++) {
        // 验证有效参数
        mcp.validateTool("add", { a: i, b: i + 1 });

        // 验证无效参数
        mcp.validateTool("add", { a: "invalid", b: i });

        // 验证缺失参数
        mcp.validateTool("add", { a: i });
      }

      const endTime = performance.now();
      const averageValidationTime = (endTime - startTime) / (VALIDATION_COUNT * 3);

      // 验证时间应该非常快（小于 0.1ms）
      expect(averageValidationTime).toBeLessThan(0.1);
      console.log(`平均参数验证时间: ${(averageValidationTime * 1000).toFixed(2)}μs (${VALIDATION_COUNT * 3} 次验证)`);
    });
  });

  describe("状态查询性能", () => {
    it("应该能快速查询状态信息", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      const QUERY_COUNT = 1000;
      const startTime = performance.now();

      for (let i = 0; i < QUERY_COUNT; i++) {
        mcp.getTransportStats();
        mcp.isServerRunning();
        mcp.getTransportStatus();
        mcp.getToolStats();
      }

      const endTime = performance.now();
      const averageQueryTime = (endTime - startTime) / (QUERY_COUNT * 4);

      // 状态查询应该非常快（小于 0.01ms）
      expect(averageQueryTime).toBeLessThan(0.01);
      console.log(`平均状态查询时间: ${(averageQueryTime * 1000).toFixed(2)}μs (${QUERY_COUNT * 4} 次查询)`);
    });
  });

  describe("错误处理性能", () => {
    it("应该能快速处理错误情况", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      const ERROR_COUNT = 500;
      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < ERROR_COUNT; i++) {
        // 各种错误情况
        promises.push(mcp.executeTool("nonexistent", {}).catch(() => {}));
        promises.push(mcp.executeTool("add", { a: "invalid", b: i }).catch(() => {}));
        promises.push(mcp.executeTool("add", { a: i }).catch(() => {}));
      }

      // 等待所有错误处理完成
      await Promise.all(promises);

      const endTime = performance.now();
      const averageErrorTime = (endTime - startTime) / (ERROR_COUNT * 3);

      // 错误处理应该很快（小于 1ms）
      expect(averageErrorTime).toBeLessThan(1);
      console.log(`平均错误处理时间: ${averageErrorTime.toFixed(2)}ms (${ERROR_COUNT * 3} 次错误处理)`);
    });
  });
});
