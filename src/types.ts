// Home Assistant 实体属性基础接口
export interface HAEntityAttributes extends Record<string, unknown> {
  friendly_name?: string;
  brightness?: number;
  color_temp_kelvin?: number;
  min_color_temp_kelvin?: number;
  max_color_temp_kelvin?: number;
  supported_color_modes?: string[] | string;
  rgb_color?: [number, number, number];
  hs_color?: [number, number];
  xy_color?: [number, number];
  effect?: string;
  effect_list?: string[];
  white_value?: number;
  color_temp?: number;
  supported_features?: number;
}

// 服务数据接口，支持动态属性
export interface ServiceData extends Record<string, unknown> {
  entity_id?: string | string[];
  brightness?: number;
  color_temp_kelvin?: number;
  rgb_color?: [number, number, number];
  hs_color?: [number, number];
  xy_color?: [number, number];
  transition?: number;
  flash?: "short" | "long";
  effect?: string;
  color_temp?: number;
  white_value?: number;
}

export interface HassState {
  attributes: HAEntityAttributes;
  entity_id: string;
  last_changed: string;
  state: string;
}

export interface HassConfig extends Record<string, unknown> {
  components: string[];
  config_dir: string;
  elevation: number;
  latitude: number;
  location_name: string;
  longitude: number;
  time_zone: string;
  unit_system: Record<string, string>;
  version: string;
  whitelist_external_dirs: string[];
}

export interface HassHistory {
  attributes: Record<string, unknown>;
  entity_id: string;
  last_changed: string;
  last_updated: string;
  state: string;
}

export type HassMinimalHistory = Pick<HassHistory, "last_changed" | "state">;

export interface HassLogbook {
  context_user_id: string | null;
  domain: string;
  entity_id: string;
  message: string;
  name: string;
  when: string;
}
