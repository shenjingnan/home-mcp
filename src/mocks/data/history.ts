import {
  generateHistoryPoint,
  generateHumidity,
  generatePowerConsumption,
  generateTemperature,
} from "@/mocks/utils/data-generator";

/**
 * Mock历史数据
 * 模拟Home Assistant的历史数据记录
 */

// 温度历史数据（最近24小时）
const temperatureHistory = [];
const now = new Date();
for (let i = 0; i < 24; i++) {
  const timestamp = new Date(now.getTime() - i * 3600000).toISOString();
  temperatureHistory.push(
    generateHistoryPoint(
      "sensor.living_room_temperature",
      generateTemperature().toFixed(1),
      {
        friendly_name: "Living Room Temperature",
        unit_of_measurement: "°C",
        device_class: "temperature",
        state_class: "measurement",
      },
      timestamp
    )
  );
}

// 湿度历史数据
const humidityHistory = [];
for (let i = 0; i < 24; i++) {
  const timestamp = new Date(now.getTime() - i * 3600000).toISOString();
  humidityHistory.push(
    generateHistoryPoint(
      "sensor.living_room_humidity",
      generateHumidity().toString(),
      {
        friendly_name: "Living Room Humidity",
        unit_of_measurement: "%",
        device_class: "humidity",
        state_class: "measurement",
      },
      timestamp
    )
  );
}

// 功耗历史数据
const powerHistory = [];
for (let i = 0; i < 48; i++) {
  const timestamp = new Date(now.getTime() - i * 1800000).toISOString(); // 每30分钟一个数据点
  powerHistory.push(
    generateHistoryPoint(
      "sensor.power_consumption",
      generatePowerConsumption().toString(),
      {
        friendly_name: "Power Consumption",
        unit_of_measurement: "W",
        device_class: "power",
        state_class: "measurement",
      },
      timestamp
    )
  );
}

// 灯光状态历史数据
const lightHistory = [
  generateHistoryPoint(
    "light.living_room_main",
    "on",
    {
      friendly_name: "Living Room Main Light",
      supported_features: 3,
      brightness: 255,
      rgb_color: [255, 255, 255],
      color_temp: 4000,
    },
    new Date(now.getTime() - 2 * 3600000).toISOString()
  ),
  generateHistoryPoint(
    "light.living_room_main",
    "off",
    {
      friendly_name: "Living Room Main Light",
      supported_features: 3,
      brightness: 0,
    },
    new Date(now.getTime() - 4 * 3600000).toISOString()
  ),
  generateHistoryPoint(
    "light.bedroom_main",
    "on",
    {
      friendly_name: "Bedroom Main Light",
      supported_features: 3,
      brightness: 180,
      rgb_color: [255, 200, 150],
      color_temp: 3000,
    },
    new Date(now.getTime() - 1 * 3600000).toISOString()
  ),
  generateHistoryPoint(
    "light.bedroom_main",
    "off",
    {
      friendly_name: "Bedroom Main Light",
      supported_features: 3,
      brightness: 0,
    },
    new Date(now.getTime() - 8 * 3600000).toISOString()
  ),
];

// 开关状态历史数据
const switchHistory = [
  generateHistoryPoint(
    "switch.outlet_1",
    "on",
    {
      friendly_name: "Outlet 1",
      supported_features: 0,
    },
    new Date(now.getTime() - 6 * 3600000).toISOString()
  ),
  generateHistoryPoint(
    "switch.outlet_2",
    "off",
    {
      friendly_name: "Outlet 2",
      supported_features: 0,
    },
    new Date(now.getTime() - 12 * 3600000).toISOString()
  ),
  generateHistoryPoint(
    "switch.garage_door",
    "closed",
    {
      friendly_name: "Garage Door",
      supported_features: 0,
      device_class: "garage_door",
    },
    new Date(now.getTime() - 0.5 * 3600000).toISOString()
  ),
];

// 传感器状态历史数据
const sensorHistory = [
  generateHistoryPoint(
    "sensor.motion_detector",
    "on",
    {
      friendly_name: "Motion Detector",
      device_class: "motion",
    },
    new Date(now.getTime() - 0.5 * 3600000).toISOString()
  ),
  generateHistoryPoint(
    "sensor.motion_detector",
    "off",
    {
      friendly_name: "Motion Detector",
      device_class: "motion",
    },
    new Date(now.getTime() - 0.25 * 3600000).toISOString()
  ),
  generateHistoryPoint(
    "sensor.door_sensor",
    "off",
    {
      friendly_name: "Door Sensor",
      device_class: "door",
    },
    new Date(now.getTime() - 8 * 3600000).toISOString()
  ),
];

// 空调历史数据
const climateHistory = [
  generateHistoryPoint(
    "climate.living_room",
    "heat",
    {
      friendly_name: "Living Room Climate",
      supported_features: 1,
      current_temperature: generateTemperature(),
      target_temp_low: 20,
      target_temp_high: 24,
      hvac_modes: ["heat", "cool", "auto", "off"],
      current_humidity: generateHumidity(),
      temperature_unit: "°C",
    },
    new Date(now.getTime() - 1 * 3600000).toISOString()
  ),
  generateHistoryPoint(
    "climate.living_room",
    "cool",
    {
      friendly_name: "Living Room Climate",
      supported_features: 1,
      current_temperature: generateTemperature(),
      target_temp_low: 20,
      target_temp_high: 24,
      hvac_modes: ["heat", "cool", "auto", "off"],
      current_humidity: generateHumidity(),
      temperature_unit: "°C",
    },
    new Date(now.getTime() - 6 * 3600000).toISOString()
  ),
];

// 覆盖器历史数据
const coverHistory = [
  generateHistoryPoint(
    "cover.living_room_blinds",
    "open",
    {
      friendly_name: "Living Room Blinds",
      supported_features: 15,
      current_position: 100,
      current_tilt_position: 0,
    },
    new Date(now.getTime() - 3 * 3600000).toISOString()
  ),
  generateHistoryPoint(
    "cover.living_room_blinds",
    "closed",
    {
      friendly_name: "Living Room Blinds",
      supported_features: 15,
      current_position: 0,
      current_tilt_position: 0,
    },
    new Date(now.getTime() - 10 * 3600000).toISOString()
  ),
];

// 太阳位置历史数据
const sunHistory = [];
for (let i = 0; i < 24; i++) {
  const timestamp = new Date(now.getTime() - i * 3600000).toISOString();
  const hour = new Date(timestamp).getHours();
  const state = hour >= 6 && hour < 18 ? "above_horizon" : "below_horizon";

  sunHistory.push(
    generateHistoryPoint(
      "sun.sun",
      state,
      {
        friendly_name: "Sun",
        elevation: state === "above_horizon" ? 45.6 : -10.2,
        azimuth: 180,
        next_dawn: "2024-01-01T06:30:00+00:00",
        next_dusk: "2024-01-01T18:45:00+00:00",
        next_midnight: "2024-01-01T00:00:00+00:00",
        next_noon: "2024-01-01T12:00:00+00:00",
        next_rising: "2024-01-01T06:45:00+00:00",
        next_setting: "2024-01-01T18:30:00+00:00",
        rising: state === "above_horizon",
      },
      timestamp
    )
  );
}

// 组合所有历史数据
export const mockHistory = [
  ...temperatureHistory,
  ...humidityHistory,
  ...powerHistory,
  ...lightHistory,
  ...switchHistory,
  ...sensorHistory,
  ...climateHistory,
  ...coverHistory,
  ...sunHistory,
];

// 按实体类型分类的历史数据
export const temperatureData = temperatureHistory;
export const humidityData = humidityHistory;
export const powerData = powerHistory;
export const lightData = lightHistory;
export const switchData = switchHistory;
export const sensorData = sensorHistory;
export const climateData = climateHistory;
export const coverData = coverHistory;
export const sunData = sunHistory;
