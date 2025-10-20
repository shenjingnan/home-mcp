/**
 * 测试辅助类型定义
 *
 * 提供测试中使用的类型定义，减少对 any 类型的依赖
 */

import type { SpyInstance } from "vitest";
import type { BestMCP } from "../src/core/server.js";

/**
 * 传输管理器测试访问接口
 */
export interface TransportManagerTestAccess {
  startCurrentTransport(server?: unknown): Promise<void>;
  getCurrentTransportStatus(): unknown;
  setCurrentTransport(transport: unknown): Promise<void>;
  reset(): void;
}

/**
 * 统一的测试访问接口，避免类型冲突
 */
export interface BestMCPTestAccess {
  // 公开方法
  stopServer(): Promise<void>;
  isServerRunning(): boolean;
  getTransportStatus(): unknown;
  getTransportStats(): unknown;
  getToolStats(): unknown;

  // 私有属性（通过属性访问以避免直接属性访问的类型问题）
  transportManager: TransportManagerTestAccess;
}

/**
 * 类型断言辅助函数，用于测试中访问私有方法
 *
 * @param mcp BestMCP 实例
 * @returns 带有测试访问权限的 BestMCP 实例
 */
export function asTestableMCP(mcp: BestMCP): BestMCPTestAccess {
  return mcp as unknown as BestMCPTestAccess;
}

/**
 * 获取传输管理器的测试访问权限
 *
 * @param mcp BestMCP 实例
 * @returns 传输管理器的测试访问接口
 */
export function getTransportManager(mcp: BestMCP): TransportManagerTestAccess {
  // 直接访问私有属性
  const testableMcp = asTestableMCP(mcp);
  return testableMcp.transportManager;
}

/**
 * 类型安全地设置当前传输层
 *
 * @param mcp BestMCP 实例
 * @param transport 传输层对象
 */
export function setCurrentTransport(mcp: BestMCP, transport: unknown): void {
  // 直接访问私有属性
  const testableMcp = asTestableMCP(mcp);
  (testableMcp as { currentTransport: unknown }).currentTransport = transport;
}

/**
 * 获取当前传输层
 *
 * @param mcp BestMCP 实例
 * @returns 当前传输层对象
 */
export function getCurrentTransport(mcp: BestMCP): unknown {
  // 直接访问私有属性
  const testableMcp = asTestableMCP(mcp);
  return (testableMcp as { currentTransport: unknown }).currentTransport;
}

/**
 * 创建测试用的 mock 配置
 */
export interface TestMockConfig {
  setupToolRequestHandlers?: boolean;
  initializeTransport?: boolean;
  startHTTPServer?: boolean;
  startCurrentTransport?: boolean;
}

/**
 * 应用常用的测试 mock
 *
 * @param mcp BestMCP 实例
 * @param vi Vitest 的 vi 对象
 * @param config mock 配置选项
 * @returns mock 对象集合，便于清理和验证
 */
export function applyTestMocks(
  mcp: BestMCP,
  vi: { spyOn: (obj: unknown, method: string) => SpyInstance },
  config: TestMockConfig = {},
): {
  setupToolHandlersSpy?: SpyInstance;
  initializeTransportSpy?: SpyInstance;
  startHTTPServerSpy?: SpyInstance;
  startCurrentTransportSpy?: SpyInstance;
  stopServerSpy?: SpyInstance;
} {
  const testableMcp = asTestableMCP(mcp);
  const transportManager = getTransportManager(mcp);

  const mocks: Record<string, SpyInstance> = {};

  if (config.setupToolRequestHandlers !== false) {
    // Mock setupToolRequestHandlers 方法
    mocks["setupToolHandlersSpy"] = vi
      .spyOn(testableMcp as Record<string, unknown>, "setupToolRequestHandlers")
      .mockImplementation(() => {});
  }

  if (config.initializeTransport !== false) {
    // Mock initializeTransport 方法
    mocks["initializeTransportSpy"] = vi
      .spyOn(testableMcp as Record<string, unknown>, "initializeTransport")
      .mockImplementation(async (transportType: string, _options: Record<string, unknown>) => {
        // 创建一个简单的 mock 传输层，正确设置类型和状态
        const mockTransport = {
          type: transportType,
          getStatus: () => ({
            isRunning: true,
            type: transportType,
            details: {
              transportType,
              description: `${transportType} 传输层`,
            },
          }),
          createTransport: async () => ({}),
          start: async () => {},
          stop: async () => {},
        };
        setCurrentTransport(mcp, mockTransport);
        await getTransportManager(mcp).setCurrentTransport(mockTransport);
        return Promise.resolve();
      });
  }

  if (config.startHTTPServer !== false) {
    // Mock startHTTPServer 方法
    mocks["startHTTPServerSpy"] = vi
      .spyOn(testableMcp as Record<string, unknown>, "startHTTPServer")
      .mockImplementation(async (options?: Record<string, unknown>) => {
        const port = options?.["port"] || 8000;
        const host = options?.["host"] || "127.0.0.1";
        console.log(`MCP Server listening on http://${host}:${port}/mcp`);
        return Promise.resolve();
      });
  }

  if (config.startCurrentTransport !== false) {
    mocks["startCurrentTransportSpy"] = vi
      .spyOn(transportManager, "startCurrentTransport")
      .mockResolvedValue(undefined);
  }

  // 添加 stopServer mock
  mocks["stopServerSpy"] = vi.spyOn(testableMcp, "stopServer").mockImplementation(async () => {
    // 重置传输层状态
    setCurrentTransport(mcp, null);
    getTransportManager(mcp).reset();
    return Promise.resolve();
  });

  return mocks;
}

/**
 * 测试工具函数：重置所有 mock
 *
 * @param mocks mock 对象集合
 */
export function resetMocks(mocks: ReturnType<typeof applyTestMocks>): void {
  Object.values(mocks).forEach((spy) => {
    if (spy && "mockReset" in spy && typeof spy.mockReset === "function") {
      spy.mockReset();
    }
  });
}

/**
 * 测试工具函数：清理所有 mock
 *
 * @param mocks mock 对象集合
 */
export function clearMocks(mocks: ReturnType<typeof applyTestMocks>): void {
  Object.values(mocks).forEach((spy) => {
    if (spy && "mockClear" in spy && typeof spy.mockClear === "function") {
      spy.mockClear();
    }
  });
}
