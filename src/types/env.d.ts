/**
 * 环境变量类型定义
 * 扩展 Node.js 的 ProcessEnv 接口以支持项目特定的环境变量
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      HA_TOKEN?: string;
      HA_BASE_URL?: string;
    }
  }
}

export {};
