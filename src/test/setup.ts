import { vi } from "vitest";

// 全局测试设置
global.console = {
  ...console,
  // 在测试中减少日志输出
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
