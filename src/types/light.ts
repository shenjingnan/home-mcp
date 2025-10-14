/**
 * 灯光控制相关类型定义
 * 基于 Home Assistant Light API 规范
 */

// 灯光控制操作类型
export type LightActionType =
  | 'turn_on'      // 开灯
  | 'turn_off'     // 关灯
  | 'toggle'       // 切换开关状态
  | 'brightness'   // 调节亮度
  | 'color'        // 设置颜色
  | 'temperature'  // 调节色温
  | 'scene';       // 场景模式

// 预设场景模式
export type LightSceneMode =
  | 'reading'      // 阅读模式
  | 'relaxing'     // 放松模式
  | 'working'      // 工作模式
  | 'party'        // 派对模式
  | 'sleeping'     // 睡眠模式
  | 'movie'        // 观影模式
  | 'dinner'       // 用餐模式
  | 'romantic';    // 浪漫模式

// RGB 颜色值
export interface RGBColor {
  r: number; // 红色分量 (0-255)
  g: number; // 绿色分量 (0-255)
  b: number; // 蓝色分量 (0-255)
}

// 灯光控制参数
export interface LightControlParams {
  // 基础参数
  entity_id: string; // 灯光设备的实体ID，支持单个或多个（逗号分隔）
  action: LightActionType; // 要执行的灯光控制操作类型

  // 亮度控制参数
  brightness?: number; // 亮度百分比 (1-100)
  brightness_step?: number; // 亮度增减步长 (-100到100)

  // 颜色控制参数
  color?: RGBColor; // RGB颜色值

  // 色温控制参数
  temperature?: number; // 色温值(2700K-6500K)
  temperature_step?: number; // 色温增减步长

  // 场景模式参数
  scene?: LightSceneMode; // 预设场景模式

  // 渐变效果参数
  transition?: number; // 渐变时间(秒)，支持0.1-60秒的平滑过渡效果

  // 扩展参数
  flash?: 'short' | 'long'; // 闪烁效果，short为短闪，long为长闪
  effect?: string; // 特殊效果名称，如支持的自定义效果
}

// 灯光状态查询参数
export interface LightStatusQueryParams {
  entity_id?: string; // 灯光设备实体ID，不填则查询所有灯光设备
  room?: string; // 房间名称筛选，支持模糊匹配
  include_attributes?: boolean; // 是否包含详细属性信息
  group_by?: 'room' | 'type' | 'none'; // 分组方式
}

// 灯光设备状态信息
export interface LightDeviceInfo {
  entity_id: string;
  friendly_name?: string;
  state: 'on' | 'off';
  brightness?: number; // 亮度百分比 (1-100)
  color?: RGBColor; // RGB颜色值
  temperature?: number; // 色温值 (K)
  last_updated: string;
  attributes?: Record<string, unknown>; // 其他属性信息
}

// 灯光状态查询结果
export interface LightStatusResult {
  lights: LightDeviceInfo[];
  groups?: Record<string, Array<LightDeviceInfo>>; // 分组结果
  total_count: number;
}

// 灯光控制结果
export interface LightControlResult {
  success: boolean;
  affected_entities: string[]; // 受影响的实体ID列表
  updated_states: import('../types').HassState[]; // 更新后的状态
  errors?: string[]; // 错误信息列表
  execution_time: number; // 执行时间（毫秒）
}

// 场景配置定义
export interface LightSceneConfig {
  name: LightSceneMode;
  display_name: string;
  brightness?: number;
  color?: RGBColor;
  temperature?: number;
  transition?: number;
  description: string;
}

// Home Assistant Light 服务参数
export interface HassLightServiceParams {
  entity_id?: string | string[];
  brightness?: number; // 0-255
  rgb_color?: [number, number, number]; // RGB数组
  color_temp?: number; // 色温 (mired)
  transition?: number; // 渐变时间（秒）
  flash?: 'short' | 'long';
  effect?: string;
}

// 错误类型定义
export class LightControlError extends Error {
  public readonly code: string;
  public readonly entity_id?: string;
  public readonly action?: LightActionType;

  constructor(message: string, code: string, entity_id?: string, action?: LightActionType) {
    super(message);
    this.name = 'LightControlError';
    this.code = code;
    if (entity_id !== undefined) {
      this.entity_id = entity_id;
    }
    if (action !== undefined) {
      this.action = action;
    }
  }
}

// 预定义的错误代码
export const LightControlErrorCodes = {
  INVALID_ENTITY_ID: 'INVALID_ENTITY_ID',
  INVALID_BRIGHTNESS: 'INVALID_BRIGHTNESS',
  INVALID_COLOR: 'INVALID_COLOR',
  INVALID_TEMPERATURE: 'INVALID_TEMPERATURE',
  INVALID_ACTION: 'INVALID_ACTION',
  SERVICE_CALL_FAILED: 'SERVICE_CALL_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
  UNSUPPORTED_ACTION: 'UNSUPPORTED_ACTION'
} as const;

// 场景配置映射表
export const LightSceneConfigs: Record<LightSceneMode, LightSceneConfig> = {
  reading: {
    name: 'reading',
    display_name: '阅读模式',
    brightness: 80,
    temperature: 4000,
    transition: 1,
    description: '适合阅读的明亮中性光'
  },
  relaxing: {
    name: 'relaxing',
    display_name: '放松模式',
    brightness: 30,
    temperature: 2700,
    transition: 2,
    description: '温馨放松的暖色光'
  },
  working: {
    name: 'working',
    display_name: '工作模式',
    brightness: 90,
    temperature: 5000,
    transition: 0.5,
    description: '高效工作的冷白光'
  },
  party: {
    name: 'party',
    display_name: '派对模式',
    brightness: 100,
    color: { r: 255, g: 100, b: 150 },
    transition: 0.3,
    description: '活跃气氛的彩色光'
  },
  sleeping: {
    name: 'sleeping',
    display_name: '睡眠模式',
    brightness: 5,
    temperature: 2700,
    transition: 3,
    description: '助眠的微弱暖光'
  },
  movie: {
    name: 'movie',
    display_name: '观影模式',
    brightness: 20,
    temperature: 3000,
    transition: 2,
    description: '观影的柔和背景光'
  },
  dinner: {
    name: 'dinner',
    display_name: '用餐模式',
    brightness: 60,
    temperature: 3500,
    transition: 1.5,
    description: '温馨用餐的暖光'
  },
  romantic: {
    name: 'romantic',
    display_name: '浪漫模式',
    brightness: 25,
    color: { r: 255, g: 50, b: 100 },
    transition: 3,
    description: '浪漫的粉红色光'
  }
};