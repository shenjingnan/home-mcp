/**
 * 数据生成器工具
 * 用于生成动态的Mock数据，模拟真实Home Assistant环境
 */

/**
 * 生成随机数字
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机温度值
 */
export function generateTemperature(): number {
  return randomBetween(18, 28) + Math.random();
}

/**
 * 生成随机湿度值
 */
export function generateHumidity(): number {
  return randomBetween(40, 70);
}

/**
 * 生成随机能耗值
 */
export function generatePowerConsumption(): number {
  return randomBetween(100, 2000);
}

/**
 * 生成随机亮度值
 */
export function generateBrightness(): number {
  return randomBetween(0, 255);
}

/**
 * 生成当前时间戳（ISO格式）
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 生成历史时间戳（指定天数前）
 */
export function getHistoricalTimestamp(daysAgo: number = 1): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

/**
 * 生成随机设备状态
 */
export function generateDeviceState(type: "light" | "sensor" | "switch" | "climate"): string {
  switch (type) {
    case "light":
      return Math.random() > 0.5 ? "on" : "off";
    case "sensor":
      return Math.random().toString();
    case "switch":
      return Math.random() > 0.5 ? "on" : "off";
    case "climate": {
      const states = ["heat", "cool", "auto", "off"];
      return states[randomBetween(0, states.length - 1)] ?? "off";
    }
    default:
      return "unknown";
  }
}

/**
 * 生成随机IP地址
 */
export function generateRandomIP(): string {
  return `${randomBetween(1, 255)}.${randomBetween(0, 255)}.${randomBetween(0, 255)}.${randomBetween(1, 254)}`;
}

/**
 * 生成随机MAC地址
 */
export function generateRandomMAC(): string {
  const chars = "0123456789ABCDEF";
  let mac = "";
  for (let i = 0; i < 6; i++) {
    if (i > 0) mac += ":";
    const char1 = chars[randomBetween(0, 15)] ?? "0";
    const char2 = chars[randomBetween(0, 15)] ?? "0";
    mac += char1 + char2;
  }
  return mac;
}

/**
 * 生成随机UUID
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成设备属性
 */
export function generateDeviceAttributes(domain: string, deviceClass?: string): Record<string, any> {
  const baseAttributes = {
    friendly_name: `Mock ${domain}`,
    icon: `mdi:${domain}`,
    supported_features: 0,
  };

  switch (domain) {
    case "light":
      return {
        ...baseAttributes,
        supported_features: 3, // 支持亮度和颜色
        brightness: generateBrightness(),
        rgb_color: [randomBetween(0, 255), randomBetween(0, 255), randomBetween(0, 255)],
        color_temp: randomBetween(2700, 6500),
        min_mireds: 153,
        max_mireds: 500,
        supported_color_modes: ["rgb", "color_temp"],
        color_mode: "rgb",
      };

    case "sensor":
      return {
        ...baseAttributes,
        unit_of_measurement: getUnitByDeviceClass(deviceClass),
        device_class: deviceClass || "unknown",
        state_class: "measurement",
      };

    case "switch":
      return {
        ...baseAttributes,
        supported_features: 0,
      };

    case "climate":
      return {
        ...baseAttributes,
        supported_features: 1, // 支持温度
        current_temperature: generateTemperature(),
        target_temp_low: generateTemperature() - 2,
        target_temp_high: generateTemperature() + 2,
        hvac_modes: ["heat", "cool", "auto", "off"],
        current_humidity: generateHumidity(),
        temperature_unit: "°C",
      };

    case "camera":
      return {
        ...baseAttributes,
        supported_features: 2, // 支持流媒体
        access_token: generateUUID(),
        entity_picture: "/api/camera_proxy/camera.mock_camera/camera_content",
      };

    default:
      return baseAttributes;
  }
}

/**
 * 根据设备类别获取单位
 */
function getUnitByDeviceClass(deviceClass?: string): string {
  const unitMap: Record<string, string> = {
    temperature: "°C",
    humidity: "%",
    power: "W",
    energy: "kWh",
    voltage: "V",
    current: "A",
    illuminance: "lx",
    pressure: "hPa",
    battery: "%",
  };

  return unitMap[deviceClass ?? ""] || "";
}

/**
 * 生成历史数据点
 */
export function generateHistoryPoint(
  entityId: string,
  state: string,
  attributes: Record<string, any>,
  timestamp?: string
): any[] {
  return [
    {
      attributes,
      entity_id: entityId,
      last_changed: timestamp || getCurrentTimestamp(),
      last_updated: timestamp || getCurrentTimestamp(),
      state,
    },
  ];
}

/**
 * 生成日志条目
 */
export function generateLogbookEntry(entityId: string, eventName: string, message?: string): any {
  return {
    entity_id: entityId,
    event_type: eventName,
    message: message || `Entity ${entityId} ${eventName}`,
    when: getCurrentTimestamp(),
    state: "unknown",
    context: {
      id: generateUUID(),
      parent_id: null,
      user_id: null,
    },
  };
}
