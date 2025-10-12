// ============================================================================
// BestMCP - 聚合导出模块
// ============================================================================
// 此文件作为所有核心模块的统一导出入口，保持向后兼容性

// 聚合导出所有核心模块
export * from './src/core/types.js';
export * from './src/core/errors.js';
export * from './src/core/decorators.js';
export * from './src/core/server.js';

// 导出 validation 模块，排除重复的函数
export {
  extractParameters,
  isZodSchemaOptional,
  getParamNames
} from './src/core/validation.js';

// 保持向后兼容性 - 重新导出主要 API
export { BestMCP } from './src/core/server.js';
export { Tool, Param } from './src/core/decorators.js';
export { zodSchemaToJsonSchema } from './src/core/validation.js';