/**
 * Logger utility for Home-MCP
 */

import { ConfigManager } from '@/config';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private format: 'json' | 'text';
  private logFile?: string;

  private constructor() {
    const config = ConfigManager.getInstance().getLoggingConfig();
    this.logLevel = this.parseLogLevel(config.level);
    this.format = config.format as 'json' | 'text';
    this.logFile = config.file;

    // 确保日志目录存在
    if (this.logFile) {
      const logDir = dirname(this.logFile);
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();

    if (this.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
      });
    } else {
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    }
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any): void {
    if (level <= this.logLevel) {
      const formattedMessage = this.formatMessage(levelName, message, meta);

      // 在 stdio 模式下，将日志输出到文件而不是控制台
      if (this.logFile) {
        try {
          appendFileSync(this.logFile, formattedMessage + '\n');
        } catch (error) {
          // 如果文件写入失败，回退到 stderr（不会干扰 stdio MCP 协议）
          process.stderr.write(`Logger error: ${error}\n`);
          process.stderr.write(formattedMessage + '\n');
        }
      } else {
        // 开发环境或未配置日志文件时，输出到 stderr
        if (level === LogLevel.ERROR) {
          process.stderr.write(formattedMessage + '\n');
        } else if (level === LogLevel.WARN) {
          process.stderr.write(formattedMessage + '\n');
        } else if (process.env['NODE_ENV'] === 'development') {
          process.stderr.write(formattedMessage + '\n');
        }
      }
    }
  }

  public error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, 'error', message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, 'warn', message, meta);
  }

  public info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, 'info', message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, 'debug', message, meta);
  }
}
