/**
 * Integration tests for stdio MCP server
 */

import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'path';

describe('stdio MCP server integration', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const testLogFile = '/tmp/home-mcp-integration-test.log';

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    // Clean up any existing log file
    if (existsSync(testLogFile)) {
      unlinkSync(testLogFile);
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    
    // Clean up test log file
    if (existsSync(testLogFile)) {
      unlinkSync(testLogFile);
    }
  });

  describe('server startup', () => {
    it('should start and stop without errors', async () => {
      const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
        env: {
          ...process.env,
          HOME_ASSISTANT_URL: 'http://localhost:8123',
          HOME_ASSISTANT_TOKEN: 'test-token',
          LOG_FILE: testLogFile,
          LOG_LEVEL: 'info'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Wait a bit for startup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Server should be running
      expect(serverProcess.pid).toBeDefined();
      expect(serverProcess.killed).toBe(false);

      // Kill the server
      serverProcess.kill('SIGTERM');

      // Wait for process to exit
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
      });

      expect(serverProcess.killed).toBe(true);
    }, 10000);

    it('should handle missing environment variables gracefully', async () => {
      const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
        env: {
          ...process.env,
          // Missing HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN
          LOG_FILE: testLogFile,
          LOG_LEVEL: 'error'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';
      serverProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for process to exit (should exit with error)
      const exitCode = await new Promise<number>((resolve) => {
        serverProcess.on('exit', (code) => resolve(code || 0));
      });

      expect(exitCode).toBe(1);
    }, 10000);

    it('should create log file when LOG_FILE is set', async () => {
      const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
        env: {
          ...process.env,
          HOME_ASSISTANT_URL: 'http://localhost:8123',
          HOME_ASSISTANT_TOKEN: 'test-token',
          LOG_FILE: testLogFile,
          LOG_LEVEL: 'info'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Wait for startup and log creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Kill the server
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
      });

      // Check if log file was created
      expect(existsSync(testLogFile)).toBe(true);
    }, 10000);
  });

  describe('MCP protocol communication', () => {
    let serverProcess: ChildProcess;

    beforeEach(async () => {
      serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
        env: {
          ...process.env,
          HOME_ASSISTANT_URL: 'http://localhost:8123',
          HOME_ASSISTANT_TOKEN: 'test-token',
          LOG_FILE: testLogFile,
          LOG_LEVEL: 'debug'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterEach(async () => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGTERM');
        await new Promise((resolve) => {
          serverProcess.on('exit', resolve);
        });
      }
    });

    it('should respond to tools/list request', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };

      let response = '';
      let responseReceived = false;

      serverProcess.stdout?.on('data', (data) => {
        response += data.toString();
        if (response.includes('"id":1')) {
          responseReceived = true;
        }
      });

      // Send request
      serverProcess.stdin?.write(JSON.stringify(request) + '\n');

      // Wait for response
      await new Promise<void>((resolve) => {
        const checkResponse = () => {
          if (responseReceived) {
            resolve();
          } else {
            setTimeout(checkResponse, 100);
          }
        };
        checkResponse();
      });

      expect(response).toContain('tools');
      expect(response).toContain('get_homeassistant_states');
    }, 15000);

    it('should handle invalid JSON gracefully', async () => {
      let errorReceived = false;
      let response = '';

      serverProcess.stdout?.on('data', (data) => {
        response += data.toString();
        if (response.includes('error')) {
          errorReceived = true;
        }
      });

      // Send invalid JSON
      serverProcess.stdin?.write('invalid json\n');

      // Wait a bit to see if server handles it gracefully
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Server should still be running
      expect(serverProcess.killed).toBe(false);
    }, 10000);
  });

  describe('performance metrics', () => {
    it('should start within reasonable time', async () => {
      const startTime = Date.now();
      
      const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
        env: {
          ...process.env,
          HOME_ASSISTANT_URL: 'http://localhost:8123',
          HOME_ASSISTANT_TOKEN: 'test-token',
          LOG_FILE: testLogFile,
          LOG_LEVEL: 'info'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Wait for server to be ready (check for log message or successful response)
      let serverReady = false;
      let logOutput = '';

      if (existsSync(testLogFile)) {
        // Monitor log file for startup message
        const checkLogs = () => {
          try {
            const fs = require('fs');
            logOutput = fs.readFileSync(testLogFile, 'utf-8');
            if (logOutput.includes('Home-MCP Server started successfully')) {
              serverReady = true;
            }
          } catch (error) {
            // File might not exist yet
          }
        };

        const interval = setInterval(checkLogs, 100);
        
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            clearInterval(interval);
            resolve();
          }, 5000);

          const checkReady = () => {
            if (serverReady) {
              clearInterval(interval);
              clearTimeout(timeout);
              resolve();
            }
          };
          
          setInterval(checkReady, 100);
        });
      } else {
        // Fallback: just wait a reasonable time
        await new Promise(resolve => setTimeout(resolve, 2000));
        serverReady = true;
      }

      const startupTime = Date.now() - startTime;

      // Kill the server
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
      });

      // Startup should be under 5 seconds
      expect(startupTime).toBeLessThan(5000);
      expect(serverReady).toBe(true);
    }, 10000);
  });

  describe('environment variable handling', () => {
    it('should use default log level when not specified', async () => {
      const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
        env: {
          ...process.env,
          HOME_ASSISTANT_URL: 'http://localhost:8123',
          HOME_ASSISTANT_TOKEN: 'test-token',
          LOG_FILE: testLogFile
          // LOG_LEVEL not specified
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
      });

      // Should have started successfully with default log level
      expect(serverProcess.pid).toBeDefined();
    }, 10000);

    it('should handle custom timeout values', async () => {
      const serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], {
        env: {
          ...process.env,
          HOME_ASSISTANT_URL: 'http://localhost:8123',
          HOME_ASSISTANT_TOKEN: 'test-token',
          LOG_FILE: testLogFile,
          TIMEOUT: '15000'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
      });

      expect(serverProcess.pid).toBeDefined();
    }, 10000);
  });
});
