import { generateLogbookEntry, generateUUID, getCurrentTimestamp } from "../utils/data-generator";

/**
 * Mock日志簿数据
 * 模拟Home Assistant的日志簿记录
 */

// 灯光相关日志
const lightLogbook = [
  generateLogbookEntry(
    "light.living_room_main",
    "light.living_room_main turned on",
    "Living Room Main Light turned on"
  ),
  generateLogbookEntry("light.bedroom_main", "light.bedroom_main turned off", "Bedroom Main Light turned off"),
  generateLogbookEntry("light.kitchen_main", "light.kitchen_main turned on", "Kitchen Main Light turned on"),
];

// 开关相关日志
const switchLogbook = [
  generateLogbookEntry("switch.outlet_1", "switch.outlet_1 turned on", "Outlet 1 turned on"),
  generateLogbookEntry("switch.garage_door", "switch.garage_door closed", "Garage Door closed"),
  generateLogbookEntry("switch.fan_main", "switch.fan_main turned off", "Fan Main turned off"),
];

// 传感器相关日志
const sensorLogbook = [
  generateLogbookEntry("sensor.motion_detector", "motion detected", "Motion detected in Living Room"),
  generateLogbookEntry("sensor.door_sensor", "door opened", "Front Door opened"),
  generateLogbookEntry("sensor.door_sensor", "door closed", "Front Door closed"),
];

// 空调相关日志
const climateLogbook = [
  generateLogbookEntry("climate.living_room", "temperature set to 22°C", "Living Room temperature set to 22°C"),
  generateLogbookEntry("climate.bedroom", "HVAC mode changed to heat", "Bedroom HVAC mode changed to heat"),
];

// 覆盖器相关日志
const coverLogbook = [
  generateLogbookEntry("cover.living_room_blinds", "opened", "Living Room Blinds opened"),
  generateLogbookEntry("cover.bedroom_curtains", "closed", "Bedroom Curtains closed"),
];

// 自动化相关日志
const automationLogbook = [
  {
    entity_id: "automation.good_morning",
    event_type: "automation_triggered",
    message: "Good Morning automation triggered",
    when: getCurrentTimestamp(),
    state: "on",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
  {
    entity_id: "automation.good_night",
    event_type: "automation_triggered",
    message: "Good Night automation triggered",
    when: new Date(Date.now() - 3600000).toISOString(),
    state: "on",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
  {
    entity_id: "automation.motion_lights",
    event_type: "automation_triggered",
    message: "Motion Lights automation triggered",
    when: new Date(Date.now() - 1800000).toISOString(),
    state: "on",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
];

// 脚本相关日志
const scriptLogbook = [
  {
    entity_id: "script.all_lights_off",
    event_type: "script_started",
    message: "All Lights Off script started",
    when: new Date(Date.now() - 2 * 3600000).toISOString(),
    state: "on",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
  {
    entity_id: "script.movie_mode",
    event_type: "script_started",
    message: "Movie Mode script started",
    when: new Date(Date.now() - 4 * 3600000).toISOString(),
    state: "on",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
];

// 系统相关日志
const systemLogbook = [
  {
    entity_id: "homeassistant.start",
    event_type: "homeassistant_start",
    message: "Home Assistant started",
    when: new Date(Date.now() - 86400000).toISOString(), // 24小时前
    state: "started",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
  {
    entity_id: "homeassistant.restart",
    event_type: "homeassistant_restart",
    message: "Home Assistant restarted",
    when: new Date(Date.now() - 43200000).toISOString(), // 12小时前
    state: "restarted",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
  {
    entity_id: "homeassistant.stop",
    event_type: "homeassistant_stop",
    message: "Home Assistant stopped",
    when: new Date(Date.now() - 86400000 * 2).toISOString(), // 48小时前
    state: "stopped",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
];

// 设备追踪相关日志
const deviceTrackerLogbook = [
  {
    entity_id: "device_tracker.iphone",
    event_type: "device_tracker.home",
    message: "iPhone arrived at Home",
    when: new Date(Date.now() - 3600000).toISOString(),
    state: "home",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
  {
    entity_id: "device_tracker.android",
    event_type: "device_tracker.not_home",
    message: "Android left Home",
    when: new Date(Date.now() - 2 * 3600000).toISOString(),
    state: "not_home",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
];

// 通知相关日志
const notificationLogbook = [
  {
    entity_id: "persistent_notification.notification",
    event_type: "persistent_notification_created",
    message: "Persistent notification created: Test notification",
    when: new Date(Date.now() - 1800000).toISOString(),
    state: "notifying",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
];

// 更新相关日志
const updateLogbook = [
  {
    entity_id: "update.home_assistant",
    event_type: "update_available",
    message: "Home Assistant update available: 2024.1.1",
    when: new Date(Date.now() - 12 * 3600000).toISOString(),
    state: "available",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
];

// 按时间戳排序所有日志
const allLogbook = [
  ...lightLogbook,
  ...switchLogbook,
  ...sensorLogbook,
  ...climateLogbook,
  ...coverLogbook,
  ...automationLogbook,
  ...scriptLogbook,
  ...systemLogbook,
  ...deviceTrackerLogbook,
  ...notificationLogbook,
  ...updateLogbook,
].sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

export const mockLogbook = allLogbook;

// 按类型分类的日志
export const lightEvents = lightLogbook;
export const switchEvents = switchLogbook;
export const sensorEvents = sensorLogbook;
export const climateEvents = climateLogbook;
export const coverEvents = coverLogbook;
export const automationEvents = automationLogbook;
export const scriptEvents = scriptLogbook;
export const systemEvents = systemLogbook;
export const deviceTrackerEvents = deviceTrackerLogbook;
export const notificationEvents = notificationLogbook;
export const updateEvents = updateLogbook;
