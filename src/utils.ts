import { readFileSync } from "node:fs";
import { join } from "node:path";

// 动态读取 package.json 中的版本号
export function getPackageVersion(): string {
  try {
    const packageJsonPath = join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || "0.0.1";
  } catch (_error) {
    console.warn("无法读取 package.json 中的版本号，使用默认版本 0.0.1");
    return "0.0.1";
  }
}

/**
 * 从参数对象中分离出路径参数和查询参数
 * @param params 完整的参数对象
 * @param pathKeys 需要提取为路径参数的键名数组
 * @returns 返回一个对象，包含 pathParams 和 queryParams
 */
export function separatePathParams<T extends Record<string, unknown>>(
  params: T | undefined,
  pathKeys: (keyof T)[],
): {
  pathParams: Partial<T>;
  queryParams: Partial<T>;
} {
  if (!params) return { pathParams: {}, queryParams: {} };

  const pathParams: Partial<T> = {};
  const queryParams: Partial<T> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (pathKeys.includes(key as keyof T)) {
      pathParams[key as keyof T] = value as T[keyof T];
    } else {
      queryParams[key as keyof T] = value as T[keyof T];
    }
  }

  return { pathParams, queryParams };
}

/**
 * 自动组装请求路径，支持路径参数占位符替换
 * 支持两种占位符格式：
 * 1. `:paramName` - Express 风格（如 `/api/logbook/:start_time`）
 * 2. `{paramName}` - OpenAPI 风格（如 `/api/logbook/{start_time}`）
 *
 * @param template 路径模板，包含占位符
 * @param params 路径参数对象
 * @returns 替换后的完整路径
 *
 * @example
 * ```typescript
 * buildPath('/api/logbook/:start_time', { start_time: '2024-01-01' })
 * 输出结果: '/api/logbook/2024-01-01'
 *
 * buildPath('/api/logbook/{start_time}', { start_time: '2024-01-01' })
 * 输出结果: '/api/logbook/2024-01-01'
 *
 * buildPath('/api/users/:userId/posts/:postId', { userId: '123', postId: '456' })
 * 输出结果: '/api/users/123/posts/456'
 *
 * 注意：如果参数值为 undefined 或不存在，保持原样或移除该段
 * buildPath('/api/logbook/:start_time', {})
 * 输出结果: '/api/logbook'
 * ```
 */
export function buildPath(template: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params || Object.keys(params).length === 0) {
    // 如果没有参数，移除所有占位符段
    return template
      .replace(/\/:\w+/g, "") // 移除 Express 风格的可选参数段
      .replace(/\/\{\w+\}/g, ""); // 移除 OpenAPI 风格的可选参数段
  }

  let path = template;

  // 替换所有占位符
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      // 替换 :paramName 格式
      path = path.replace(`:${key}`, String(value));
      // 替换 {paramName} 格式
      path = path.replace(`{${key}}`, String(value));
    }
  }

  // 移除未替换的可选参数段（如果参数值为 undefined）
  path = path
    .replace(/\/:\w+/g, "") // 移除未替换的 Express 风格参数
    .replace(/\/\{\w+\}/g, ""); // 移除未替换的 OpenAPI 风格参数

  return path;
}
