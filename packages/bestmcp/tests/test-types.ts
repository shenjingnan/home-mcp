/**
 * 测试辅助类型定义
 *
 * 提供测试中使用的类型定义，减少对 any 类型的依赖
 */

import type { BestMCP } from "../src/core/server.js";

/**
 * 测试中需要访问的 BestMCP 私有方法接口
 */
export interface BestMCPTestAccess {
  setupToolRequestHandlers(): void;
  initializeTransport(transportType: string, options?: Record<string, unknown>): Promise<void>;
  startHTTPServer(options?: Record<string, unknown>): Promise<void>;
  stopServer(): Promise<void>;
}

/**
 * 测试中需要访问的 BestMCP 私有属性接口
 */
export interface BestMCPPrivateAccess {
  currentTransport: unknown;
  transportManager: TransportManagerTestAccess;
}

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
 * 类型断言辅助函数，用于测试中访问私有方法
 *
 * @param mcp BestMCP 实例
 * @returns 带有测试访问权限的 BestMCP 实例
 */
export function asTestableMCP(mcp: BestMCP): BestMCP & BestMCPTestAccess {
  return mcp as unknown as BestMCP & BestMCPTestAccess;
}

/**
 * 获取传输管理器的测试访问权限
 *
 * @param mcp BestMCP 实例
 * @returns 传输管理器的测试访问接口
 */
export function getTransportManager(mcp: BestMCP): TransportManagerTestAccess {
  // @ts-expect-error - 访问私有属性以进行测试
  return mcp.transportManager as TransportManagerTestAccess;
}

/**
 * 类型安全地设置当前传输层
 *
 * @param mcp BestMCP 实例
 * @param transport 传输层对象
 */
export function setCurrentTransport(mcp: BestMCP, transport: unknown): void {
  // @ts-expect-error - 访问私有属性进行测试
  const testableMcp = mcp as unknown as BestMCP & BestMCPPrivateAccess;
  testableMcp.currentTransport = transport;
}

/**
 * 获取当前传输层
 *
 * @param mcp BestMCP 实例
 * @returns 当前传输层对象
 */
export function getCurrentTransport(mcp: BestMCP): unknown {
  // @ts-expect-error - 访问私有属性进行测试
  const testableMcp = mcp as unknown as BestMCP & BestMCPPrivateAccess;
  return testableMcp.currentTransport;
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
  vi: { spyOn: (obj: unknown, method: string) => unknown },
  config: TestMockConfig = {},
): {
  setupToolHandlersSpy?: unknown;
  initializeTransportSpy?: unknown;
  startHTTPServerSpy?: unknown;
  startCurrentTransportSpy?: unknown;
  stopServerSpy?: unknown;
} {
  const testableMcp = asTestableMCP(mcp);
  const transportManager = getTransportManager(mcp);

  const mocks: Record<string, unknown> = {};

  if (config.setupToolRequestHandlers !== false) {
    mocks.setupToolHandlersSpy = vi.spyOn(testableMcp, "setupToolRequestHandlers").mockImplementation(() => {});
  }

  if (config.initializeTransport !== false) {
    mocks.initializeTransportSpy = vi
      .spyOn(testableMcp, "initializeTransport")
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
    mocks.startHTTPServerSpy = vi
      .spyOn(testableMcp, "startHTTPServer")
      .mockImplementation(async (options?: Record<string, unknown>) => {
        const port = options?.port || 8000;
        const host = options?.host || "127.0.0.1";
        console.log(`MCP Server listening on http://${host}:${port}/mcp`);
        return Promise.resolve();
      });
  }

  if (config.startCurrentTransport !== false) {
    mocks.startCurrentTransportSpy = vi.spyOn(transportManager, "startCurrentTransport").mockResolvedValue(undefined);
  }

  // 添加 stopServer mock
  mocks.stopServerSpy = vi.spyOn(testableMcp, "stopServer").mockImplementation(async () => {
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
    if (spy && typeof spy.mockReset === "function") {
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
    if (spy && typeof spy.mockClear === "function") {
      spy.mockClear();
    }
  });
}
