/**
 * Switch 控制相关类型定义
 * 基于 Home Assistant Switch API 规范
 */

// ==================== 操作类型 ====================

/**
 * Switch 控制操作类型
 */
export type SwitchActionType =
  | "turn_on" // 开启设备
  | "turn_off" // 关闭设备
  | "toggle"; // 切换状态 (反转当前状态)

/**
 * Switch 设备类
 */
export type SwitchDeviceClass =
  | "outlet" // 插座
  | "switch" // 墙壁开关
  | "fan" // 风扇
  | "none"; // 无特定类别

// ==================== 设备信息 ====================

/**
 * Switch 设备功率信息
 * 从 extra_state_attributes 中提取
 */
export interface SwitchPowerInfo {
  current_power_w?: number; // 当前功率 (瓦特)
  today_energy_kwh?: number; // 今日耗电量 (千瓦时)
  monthly_energy_kwh?: number; // 本月耗电量 (千瓦时)
}

/**
 * Switch 设备信息
 */
export interface SwitchDeviceInfo {
  entity_id: string;
  friendly_name?: string;
  state: "on" | "off";
  device_class?: SwitchDeviceClass;
  last_updated: string;
  power_info?: SwitchPowerInfo;
  attributes?: Record<string, unknown>;
}

// ==================== 控制参数和结果 ====================

/**
 * Switch 控制参数
 */
export interface SwitchControlParams {
  name: string; // 设备名称
  action: SwitchActionType; // 控制动作
}

/**
 * Switch 控制结果
 */
export interface SwitchControlResult {
  success: boolean;
  entity_id: string;
  friendly_name: string;
  action: SwitchActionType;
  state?: "on" | "off";
  power_info?: SwitchPowerInfo;
  message?: string;
  execution_time?: number;
}

/**
 * 多设备匹配响应
 */
export interface MultipleDeviceResponse {
  success: false;
  msg: string;
  entities: Array<{
    entity_id: string;
    friendly_name: string;
  }>;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  success: false;
  entity_id?: string;
  friendly_name?: string;
  errors: string[];
}

// ==================== 错误类型 ====================

/**
 * Switch 控制错误类
 */
export class SwitchControlError extends Error {
  public readonly code: string;
  public readonly entity_id?: string;
  public readonly action?: SwitchActionType;

  constructor(message: string, code: string, entity_id?: string, action?: SwitchActionType) {
    super(message);
    this.name = "SwitchControlError";
    this.code = code;
    if (entity_id !== undefined) {
      this.entity_id = entity_id;
    }
    if (action !== undefined) {
      this.action = action;
    }
  }
}

/**
 * 预定义的错误代码
 */
export const SwitchControlErrorCodes = {
  DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
  MULTIPLE_DEVICES_FOUND: "MULTIPLE_DEVICES_FOUND",
  INVALID_ACTION: "INVALID_ACTION",
  SERVICE_CALL_FAILED: "SERVICE_CALL_FAILED",
  DEVICE_OFFLINE: "DEVICE_OFFLINE",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;
