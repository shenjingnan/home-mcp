import { generateUUID, getCurrentTimestamp } from "@/mocks/utils/data-generator";

/**
 * Mock事件数据
 * 模拟Home Assistant中的事件监听器
 */

// 系统事件类型
export const mockEventTypes = [
  "homeassistant_start",
  "homeassistant_stop",
  "homeassistant_restart",
  "service_registered",
  "component_loaded",
  "state_changed",
  "automation_triggered",
  "script_started",
  "call_service",
  "platform_discovered",
  "device_discovered",
  "device_registry_updated",
  "entity_registry_updated",
  "area_registry_updated",
  "scene_reloaded",
  "group_reloaded",
  "automation_reloaded",
  "script_reloaded",
  "restored",
  "service_executed",
  "timer_started",
  "timer_finished",
  "timer_cancelled",
  "sun_set",
  "sun_rise",
  "mqtt_message_received",
  "websocket_connected",
  "websocket_disconnected",
  "zha_device_joined",
  "zha_device_left",
  "zha_entity_updated",
  "zeroconf_device_discovered",
  "upnp_device_discovered",
  "dhcp_device_discovered",
  "network_device_discovered",
];

// 当前活跃的事件监听器
export const mockEvents = [
  {
    event_type: "state_changed",
    listener_count: 15,
    listeners: [
      {
        name: "automation.motion_lights",
        id: generateUUID(),
      },
      {
        name: "script.light_sync",
        id: generateUUID(),
      },
      {
        name: "frontend.latest",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: getCurrentTimestamp(),
  },
  {
    event_type: "service_registered",
    listener_count: 5,
    listeners: [
      {
        name: "frontend.latest",
        id: generateUUID(),
      },
      {
        name: "logger",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    event_type: "automation_triggered",
    listener_count: 8,
    listeners: [
      {
        name: "frontend.latest",
        id: generateUUID(),
      },
      {
        name: "logger",
        id: generateUUID(),
      },
      {
        name: "logbook",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    event_type: "call_service",
    listener_count: 12,
    listeners: [
      {
        name: "frontend.latest",
        id: generateUUID(),
      },
      {
        name: "logger",
        id: generateUUID(),
      },
      {
        name: "history",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: getCurrentTimestamp(),
  },
  {
    event_type: "device_registry_updated",
    listener_count: 3,
    listeners: [
      {
        name: "frontend.latest",
        id: generateUUID(),
      },
      {
        name: "device_tracker.see",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    event_type: "entity_registry_updated",
    listener_count: 6,
    listeners: [
      {
        name: "frontend.latest",
        id: generateUUID(),
      },
      {
        name: "recorder",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    event_type: "area_registry_updated",
    listener_count: 2,
    listeners: [
      {
        name: "frontend.latest",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    event_type: "zha_device_joined",
    listener_count: 4,
    listeners: [
      {
        name: "zha_event_listener",
        id: generateUUID(),
      },
      {
        name: "logger",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    event_type: "mqtt_message_received",
    listener_count: 7,
    listeners: [
      {
        name: "mqtt_sensor_listener",
        id: generateUUID(),
      },
      {
        name: "mqtt_switch_listener",
        id: generateUUID(),
      },
      {
        name: "logger",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 300000).toISOString(),
  },
  {
    event_type: "websocket_connected",
    listener_count: 3,
    listeners: [
      {
        name: "websocket_api",
        id: generateUUID(),
      },
      {
        name: "mobile_app",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 600000).toISOString(),
  },
  {
    event_type: "timer_started",
    listener_count: 2,
    listeners: [
      {
        name: "automation_timer_listener",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 900000).toISOString(),
  },
  {
    event_type: "sun_set",
    listener_count: 5,
    listeners: [
      {
        name: "automation.sunset_lights",
        id: generateUUID(),
      },
      {
        name: "scene.evening_mode",
        id: generateUUID(),
      },
      {
        name: "climate.evening_schedule",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    event_type: "sun_rise",
    listener_count: 4,
    listeners: [
      {
        name: "automation.morning_lights",
        id: generateUUID(),
      },
      {
        name: "scene.morning_mode",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 3600000 * 15).toISOString(),
  },
  {
    event_type: "component_loaded",
    listener_count: 6,
    listeners: [
      {
        name: "frontend.latest",
        id: generateUUID(),
      },
      {
        name: "logger",
        id: generateUUID(),
      },
    ],
    created: getCurrentTimestamp(),
    last_fired: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

// 最近触发的事件
export const recentEvents = [
  {
    event_type: "state_changed",
    data: {
      entity_id: "light.living_room_main",
      old_state: {
        entity_id: "light.living_room_main",
        state: "off",
        attributes: {
          friendly_name: "Living Room Main Light",
          supported_features: 3,
        },
        last_changed: new Date(Date.now() - 3600000).toISOString(),
        last_updated: new Date(Date.now() - 3600000).toISOString(),
      },
      new_state: {
        entity_id: "light.living_room_main",
        state: "on",
        attributes: {
          friendly_name: "Living Room Main Light",
          supported_features: 3,
          brightness: 255,
          rgb_color: [255, 255, 255],
        },
        last_changed: getCurrentTimestamp(),
        last_updated: getCurrentTimestamp(),
      },
    },
    origin: "LOCAL",
    time_fired: getCurrentTimestamp(),
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
  {
    event_type: "call_service",
    data: {
      domain: "light",
      service: "turn_on",
      service_data: {
        entity_id: "light.living_room_main",
        brightness_pct: 100,
      },
    },
    origin: "LOCAL",
    time_fired: getCurrentTimestamp(),
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
  {
    event_type: "automation_triggered",
    data: {
      entity_id: "automation.motion_lights",
      skip_condition: false,
      context: {
        id: generateUUID(),
        parent_id: null,
        user_id: null,
      },
    },
    origin: "LOCAL",
    time_fired: new Date(Date.now() - 300000).toISOString(),
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  },
];
