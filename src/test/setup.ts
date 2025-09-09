/**
 * Vitest test setup file
 * This file is executed before each test file
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// 设置测试环境变量
process.env['NODE_ENV'] = 'test';
process.env['HOME_ASSISTANT_URL'] = 'http://localhost:8123';
process.env['HOME_ASSISTANT_TOKEN'] = 'test-token';
process.env['LOG_LEVEL'] = 'error'; // 减少测试日志输出
process.env['LOG_FORMAT'] = 'json';

// 全局测试超时设置
vi.setConfig({
  testTimeout: 10000,
  hookTimeout: 10000
});

// Mock console 方法以减少测试噪音
const originalConsole = console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// 全局 fetch mock 设置
Object.defineProperty(global, 'fetch', {
  value: vi.fn(),
  writable: true,
});

// 全局 AbortController mock
Object.defineProperty(global, 'AbortController', {
  value: class MockAbortController {
    signal = { aborted: false };
    abort() {
      this.signal.aborted = true;
    }
  },
  writable: true,
});

// 清理函数，在每个测试后运行
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});
