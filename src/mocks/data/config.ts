/**
 * Mock系统配置数据
 * 模拟Home Assistant的系统配置信息
 */

export const mockConfig = {
  // 基本配置
  config_dir: "/config",
  elevation: 10,
  latitude: 32.87336,
  longitude: -117.22743,
  location_name: "Home",
  time_zone: "America/Los_Angeles",
  temperature_unit: "°C",
  version: "2024.1.0",
  // 单位系统
  unit_system: {
    length: "km",
    mass: "g",
    pressure: "Pa",
    volume: "L",
    accumulated_precipitation: "mm",
  },
  // 配置源
  config_source: "yaml",
  // 颜色配置
  components: ["default_config", "http", "mobile_app", "rest", "websocket_api", "zeroconf"],
  // 是否允许远程控制
  allowlist_external_dirs: ["/config/www", "/media"],
  // 是否恢复状态
  recovery_mode: false,
  // 是否处于安全模式
  safe_mode: false,
  // 状态文件目录
  state_file: "/config/.storage/core.config",
  // 外部URL
  external_url: "https://homeassistant.local:8123",
  // 内部URL
  internal_url: "http://homeassistant.local:8123",
  // 语言设置
  language: "en",
  // 国家设置
  country: "US",
  // 主题设置
  theme: "default",
  // 认证设置
  auth_providers: [
    {
      type: "homeassistant",
    },
    {
      type: "trusted_networks",
    },
  ],
  // HTTP配置
  http: {
    server_host: "0.0.0.0",
    server_port: 8123,
    cors_allowed_origins: ["https://cast.home-assistant.io"],
    use_x_forwarded_for: true,
    trusted_proxies: ["172.30.33.0/24", "127.0.0.1"],
    ip_ban_enabled: true,
    login_attempts_threshold: 5,
  },
  // WebSocket配置
  websocket_api: {
    cors_allowed_origins: ["https://cast.home-assistant.io"],
  },
  // 移动应用配置
  mobile_app: {
    registration_enabled: true,
  },
  // 零配置发现
  zeroconf: {
    default_interface: true,
    ipv6: true,
  },
  // REST API配置
  rest: {
    timeout: 10,
  },
  // 日志配置
  logger: {
    default: "info",
    logs: {
      "homeassistant.components.websocket_api.http": "debug",
      "custom_components.*": "info",
    },
  },
  // 录像配置
  recorder: {
    db_url: "sqlite:///config/home-assistant_v2.db",
    keep_days: 10,
    purge_keep_days: 5,
    auto_purge: true,
    exclude: {
      domains: ["camera", "media_player", "person", "zone"],
      entity_globs: ["sensor.*_battery", "sensor.*_wifi_strength"],
    },
  },
  // 历史记录配置
  history: {
    include: {
      domains: ["sensor", "switch", "light", "climate"],
      entity_globs: ["sensor.temperature_*", "sensor.humidity_*"],
    },
    exclude: {
      entity_globs: ["sensor.*_battery", "sensor.*_wifi_strength"],
    },
  },
  // 日志簿配置
  logbook: {
    include: {
      domains: ["automation", "script", "sun"],
      entity_globs: ["sensor.*_temperature", "sensor.*_humidity"],
    },
    exclude: {
      domains: ["camera", "media_player"],
    },
  },
};
