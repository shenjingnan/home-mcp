/**
 * 响应构建工具
 * 用于创建标准化的Home Assistant API响应格式
 */

/**
 * Home Assistant API 标准响应格式
 */
export interface HassResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

/**
 * 构建标准API响应
 * @param data 响应数据
 * @param message 响应消息（可选）
 * @param code 状态码（可选）
 */
export function buildResponse<T>(data: T, message?: string, code?: number): HassResponse<T> {
  const response: HassResponse<T> = { data };

  if (message) {
    response.message = message;
  }

  if (code !== undefined) {
    response.code = code;
  }

  return response;
}

/**
 * 创建成功响应
 * @param data 响应数据
 */
export function createSuccessResponse<T>(data: T): HassResponse<T> {
  return buildResponse(data, "Success", 200);
}

/**
 * 创建错误响应
 * @param message 错误消息
 * @param code 错误码
 */
export function createErrorResponse(message: string, code: number = 400): HassResponse {
  return buildResponse(null, message, code);
}

/**
 * 创建认证错误响应
 */
export function createAuthErrorResponse(): HassResponse {
  return createErrorResponse("Unauthorized: Invalid or missing access token", 401);
}

/**
 * 创建实体未找到响应
 * @param entityId 实体ID
 */
export function createEntityNotFoundResponse(entityId: string): HassResponse {
  return createErrorResponse(`Entity ${entityId} not found`, 404);
}

/**
 * 创建服务调用成功响应
 * @param domain 域名
 * @param service 服务名
 */
export function createServiceCallResponse(domain: string, service: string): HassResponse {
  return buildResponse(
    {
      context: {
        id: `SERVICE_${Date.now()}`,
        parent_id: null,
        user_id: null,
      },
      service_call_id: `SERVICE_CALL_${domain}_${service}_${Date.now()}`,
    },
    "Service called successfully"
  );
}

/**
 * 创建状态更新响应
 * @param entity 更新后的实体状态
 */
export function createStateUpdateResponse(entity: any): HassResponse {
  return buildResponse(entity, "State updated successfully");
}
