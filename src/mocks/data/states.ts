import {
  generateDeviceAttributes,
  generateDeviceState,
  generateHumidity,
  generatePowerConsumption,
  generateTemperature,
  getCurrentTimestamp,
} from "@/mocks/utils/data-generator";

/**
 * Mock设备状态数据
 * 模拟Home Assistant中的各种设备状态
 */

// 灯光设备
const lightStates = [
  {
    entity_id: "light.living_room_main",
    state: "on",
    attributes: generateDeviceAttributes("light"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "light.bedroom_main",
    state: "off",
    attributes: generateDeviceAttributes("light"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "light.kitchen_main",
    state: "on",
    attributes: generateDeviceAttributes("light"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "light.bathroom_main",
    state: "off",
    attributes: generateDeviceAttributes("light"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
];

// 传感器设备
const sensorStates = [
  {
    entity_id: "sensor.living_room_temperature",
    state: generateTemperature().toFixed(1),
    attributes: generateDeviceAttributes("sensor", "temperature"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "sensor.living_room_humidity",
    state: generateHumidity().toString(),
    attributes: generateDeviceAttributes("sensor", "humidity"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "sensor.outdoor_temperature",
    state: "15.2",
    attributes: generateDeviceAttributes("sensor", "temperature"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "sensor.outdoor_humidity",
    state: "65",
    attributes: generateDeviceAttributes("sensor", "humidity"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "sensor.power_consumption",
    state: generatePowerConsumption().toString(),
    attributes: generateDeviceAttributes("sensor", "power"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "sensor.motion_detector",
    state: "off",
    attributes: generateDeviceAttributes("sensor", "motion"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "sensor.door_sensor",
    state: "off",
    attributes: generateDeviceAttributes("sensor", "door"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "sensor.light_sensor",
    state: "450",
    attributes: generateDeviceAttributes("sensor", "illuminance"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
];

// 开关设备
const switchStates = [
  {
    entity_id: "switch.outlet_1",
    state: "on",
    attributes: {
      ...generateDeviceAttributes("switch", "outlet"),
      friendly_name: "客厅插座",
      device_class: "outlet",
    },
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "switch.outlet_2",
    state: "off",
    attributes: {
      ...generateDeviceAttributes("switch", "outlet"),
      friendly_name: "卧室插座",
      device_class: "outlet",
    },
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "switch.outlet_kitchen",
    state: "on",
    attributes: {
      ...generateDeviceAttributes("switch", "outlet"),
      friendly_name: "厨房插座",
      device_class: "outlet",
    },
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "switch.fan_main",
    state: "off",
    attributes: {
      ...generateDeviceAttributes("switch", "fan"),
      friendly_name: "卧室风扇",
      device_class: "fan",
    },
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "switch.garage_door",
    state: "closed",
    attributes: {
      ...generateDeviceAttributes("switch"),
      friendly_name: "车库门",
      device_class: "garage",
    },
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
];

// 空调设备
const climateStates = [
  {
    entity_id: "climate.living_room",
    state: generateDeviceState("climate"),
    attributes: generateDeviceAttributes("climate"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "climate.bedroom",
    state: "heat",
    attributes: generateDeviceAttributes("climate"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
];

// 摄像头设备
const cameraStates = [
  {
    entity_id: "camera.front_door",
    state: "recording",
    attributes: generateDeviceAttributes("camera"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "camera.back_yard",
    state: "idle",
    attributes: generateDeviceAttributes("camera"),
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
];

// 覆盖器设备
const coverStates = [
  {
    entity_id: "cover.living_room_blinds",
    state: "open",
    attributes: {
      ...generateDeviceAttributes("cover"),
      current_position: 100,
      current_tilt_position: 0,
      supported_features: 15, // 支持位置、倾斜、打开、关闭
    },
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "cover.bedroom_curtains",
    state: "closed",
    attributes: {
      ...generateDeviceAttributes("cover"),
      current_position: 0,
      current_tilt_position: 0,
      supported_features: 15,
    },
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
];

// 其他系统实体
const systemStates = [
  {
    entity_id: "sun.sun",
    state: "above_horizon",
    attributes: {
      ...generateDeviceAttributes("sun"),
      elevation: 45.6,
      azimuth: 180,
      next_dawn: "2024-01-01T06:30:00+00:00",
      next_dusk: "2024-01-01T18:45:00+00:00",
      next_midnight: "2024-01-01T00:00:00+00:00",
      next_noon: "2024-01-01T12:00:00+00:00",
      next_rising: "2024-01-01T06:45:00+00:00",
      next_setting: "2024-01-01T18:30:00+00:00",
      rising: true,
      friendly_name: "Sun",
    },
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
  {
    entity_id: "zone.home",
    state: "zoning",
    attributes: {
      ...generateDeviceAttributes("zone"),
      radius: 100,
      passive: false,
      latitude: 32.87336,
      longitude: -117.22743,
      track_ios: true,
      hidden: true,
      friendly_name: "Home",
      icon: "mdi:home",
    },
    last_changed: getCurrentTimestamp(),
    last_updated: getCurrentTimestamp(),
  },
];

// 组合所有状态数据
export const mockStates = [
  ...lightStates,
  ...sensorStates,
  ...switchStates,
  ...climateStates,
  ...cameraStates,
  ...coverStates,
  ...systemStates,
];

// 导出不同类型的实体数组，便于测试
export const lightEntities = lightStates;
export const sensorEntities = sensorStates;
export const switchEntities = switchStates;
export const climateEntities = climateStates;
export const cameraEntities = cameraStates;
export const coverEntities = coverStates;
export const systemEntities = systemStates;
