---
description: Home Assistant模拟数据生成
---

我是 Home Assistant 模拟数据生成技能，专门为 Home-MCP 项目生成符合 Home Assistant API 规范的测试数据。

## 技能能力

### 1. 设备状态数据生成
基于现有的 `src/mocks/data/` 结构，为各种 Home Assistant 设备生成模拟状态数据：

#### 支持的设备类型
- **灯光设备** (`light.*`)：亮度、色温、颜色控制
- **传感器设备** (`sensor.*`)：温度、湿度、运动、光照等
- **开关设备** (`switch.*`)：普通开关、智能插座
- **二进制传感器** (`binary_sensor.*`)：门、窗、运动检测
- **摄像头设备** (`camera.*`)：监控摄像头、门铃
- **恒温器设备** (`climate.*`)：空调、暖气、温控器
- **覆盖器设备** (`cover.*`)：窗帘、百叶窗、车库门
- **设备追踪器** (`device_tracker.*`)：手机、车辆定位

### 2. 历史数据生成
生成设备状态变化的历史记录，支持：
- 时间序列数据
- 状态变化记录
- 属性变更历史
- 可配置的时间范围和数据密度

### 3. 服务调用数据模拟
模拟 Home Assistant 服务调用的响应数据：
- 服务执行结果
- 状态变更记录
- 错误响应模拟
- 批量操作结果

### 4. 日志记录生成
生成 Home Assistant 日志簿记录：
- 设备操作日志
- 自动化触发记录
- 系统事件日志
- 用户操作记录

## 数据生成规则

### 设备命名规范
```typescript
// 设备命名模式
const devicePatterns = {
  light: ["living_room_main", "bedroom_ceiling", "kitchen_under_cabinet", "garage_outdoor"],
  sensor: ["temperature_living_room", "humidity_bedroom", "motion_front_door", "light_level_outdoor"],
  switch: ["outlet_1", "fan_main", "christmas_lights", "water_heater"],
  binary_sensor: ["front_door", "back_window", "smoke_detector", "motion_hallway"],
  camera: ["front_door", "backyard", "nursery", "garage"],
  climate: ["thermostat_main", "air_conditioner", "heating_system", "dehumidifier"],
  cover: ["living_room_blinds", "bedroom_curtains", "garage_door", "awning_patio"],
  device_tracker: ["iphone_person1", "android_person2", "car_gps", "tablet_living_room"]
};
```

### 状态值规范
```typescript
// 状态值枚举
const stateValues = {
  light: ["on", "off"],
  switch: ["on", "off"],
  binary_sensor: ["on", "off"],
  camera: ["on", "off", "recording", "streaming"],
  climate: ["heat", "cool", "auto", "off"],
  cover: ["open", "closed", "opening", "closing"],
  device_tracker: ["home", "not_home", "away", "work"]
};
```

### 属性模板
每个设备类型都有标准的属性模板：
- **friendly_name**：设备友好名称
- **supported_features**：支持的功能特性
- **device_class**：设备类别
- **unit_of_measurement**：测量单位（传感器）
- **area_id**：所属区域

## 使用示例

### 生成灯光设备数据
```typescript
// 生成客厅主灯的模拟数据
const mockLightData = generateLightDevice({
  entity_id: "light.living_room_main",
  friendly_name: "Living Room Main Light",
  state: "on",
  attributes: {
    brightness: 255,
    color_temp: 3000,
    rgb_color: [255, 255, 255],
    supported_features: 191
  }
});
```

### 生成传感器数据
```typescript
// 生成温度传感器数据
const mockTempData = generateSensorDevice({
  entity_id: "sensor.temperature_living_room",
  friendly_name: "Living Room Temperature",
  device_class: "temperature",
  unit_of_measurement: "°C",
  state: "22.5",
  attributes: {
    last_updated: new Date().toISOString(),
    battery_level: 85
  }
});
```

### 生成历史数据
```typescript
// 生成过去24小时的历史数据
const mockHistory = generateHistoryData({
  entity_id: "sensor.temperature_living_room",
  start_time: new Date(Date.now() - 24 * 60 * 60 * 1000),
  end_time: new Date(),
  data_points: 144, // 每10分钟一个数据点
  value_range: { min: 18, max: 26 }
});
```

## 数据验证

生成的数据都经过以下验证：

### API 规范验证
- 实体ID格式符合 Home Assistant 标准
- 状态值在有效范围内
- 属性名称和类型正确
- 时间戳格式正确

### 业务逻辑验证
- 设备状态与属性逻辑一致
- 支持的功能特性匹配设备类型
- 数值在合理范围内
- 关联数据保持一致性

## 配置选项

### 全局配置
```typescript
interface MockConfig {
  defaultArea: string;
  deviceNamingPattern: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  dataDensity: number; // 每小时数据点数量
}
```

### 设备特定配置
```typescript
interface DeviceConfig {
  deviceType: string;
  count: number;
  attributes: Record<string, any>;
  stateGenerator?: () => string;
  attributeGenerator?: () => Record<string, any>;
}
```

## 输出格式

### JSON 格式
```json
{
  "entity_id": "light.living_room_main",
  "state": "on",
  "attributes": {
    "friendly_name": "Living Room Main Light",
    "brightness": 255,
    "color_temp": 3000,
    "supported_features": 191
  },
  "last_changed": "2024-01-15T10:30:00+00:00",
  "last_updated": "2024-01-15T10:30:00+00:00",
  "context": {
    "id": "01HM4X2JY8QK2Z3W4A5B6C7D8E",
    "parent_id": null,
    "user_id": "user123"
  }
}
```

### TypeScript 格式
生成完整的 TypeScript 接口和类型定义，便于类型安全的数据使用。

## 集成方式

### 直接调用
```typescript
import { MockGenerator } from '@/mocks/utils/mock-generator';

const generator = new MockGenerator();
const mockData = generator.generateDevices({
  types: ['light', 'sensor'],
  count: 10,
  area: 'living_room'
});
```

### 配置文件生成
```typescript
// 生成完整的mock数据文件
generator.generateMockDataFile({
  output: 'src/mocks/data/custom-devices.ts',
  devices: [
    { type: 'light', count: 5 },
    { type: 'sensor', count: 8 },
    { type: 'switch', count: 3 }
  ]
});
```

## 质量保证

- **数据真实性**：生成的数据符合真实设备特征
- **API 兼容性**：完全兼容 Home Assistant API 格式
- **类型安全**：提供完整的 TypeScript 类型定义
- **性能优化**：支持大量数据的高效生成

## 最佳实践

1. **合理命名**：使用有意义的设备名称和区域标识
2. **数据一致性**：确保相关设备之间的数据逻辑一致
3. **边界条件**：包含各种边界情况和异常状态
4. **性能考虑**：大量数据生成时考虑内存和性能影响
5. **文档化**：为生成的数据提供清晰的说明文档

通过这个技能，可以快速生成高质量的 Home Assistant 测试数据，提升开发和测试效率。