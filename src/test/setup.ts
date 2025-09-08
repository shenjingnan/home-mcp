/**
 * Jest test setup file
 * This file is executed before each test file
 */

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['HOME_ASSISTANT_URL'] = 'http://localhost:8123';
process.env['HOME_ASSISTANT_TOKEN'] = 'test-token';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
const originalConsole = console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});
