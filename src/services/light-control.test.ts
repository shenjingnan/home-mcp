import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HassState } from "../types";
import {
  LightControlError,
  type LightControlParams,
  LightSceneConfigs,
  type LightStatusQueryParams,
} from "../types/light";
import { LightControlService } from "./light-control";

// Mock HassService
const mockHassService = {
  getStates: vi.fn(),
  callServices: vi.fn(),
};

describe("LightControlService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LightControlService.setHassService(mockHassService);
  });

  describe("controlLight", () => {
    it("应该成功开灯", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.living_room",
        action: "turn_on",
      };

      const mockResponse = {
        changed_states: [
          {
            entity_id: "light.living_room",
            state: "on",
            attributes: { friendly_name: "Living Room Light" },
            last_changed: "2024-01-01T12:00:00Z",
          },
        ],
      };

      mockHassService.callServices.mockResolvedValue(mockResponse);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.affected_entities).toEqual(["light.living_room"]);
      expect(result.updated_states).toEqual(mockResponse.changed_states);
      expect(result.errors).toBeUndefined();
      expect(typeof result.execution_time).toBe("number");
      expect(result.execution_time).toBeGreaterThanOrEqual(0);

      // 验证调用参数
      expect(mockHassService.callServices).toHaveBeenCalledWith({
        domain: "light",
        service: "turn_on",
        service_data: {
          entity_id: ["light.living_room"],
        },
      });
    });

    it("应该成功关灯", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.bedroom,light.kitchen",
        action: "turn_off",
      };

      const mockResponse = {
        changed_states: [
          {
            entity_id: "light.bedroom",
            state: "off",
            attributes: { friendly_name: "Bedroom Light" },
            last_changed: "2024-01-01T12:00:00Z",
          },
          {
            entity_id: "light.kitchen",
            state: "off",
            attributes: { friendly_name: "Kitchen Light" },
            last_changed: "2024-01-01T12:00:00Z",
          },
        ],
      };

      mockHassService.callServices.mockResolvedValue(mockResponse);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.affected_entities).toEqual(["light.bedroom", "light.kitchen"]);
      expect(result.errors).toBeUndefined();

      // 验证调用参数
      expect(mockHassService.callServices).toHaveBeenCalledWith({
        domain: "light",
        service: "turn_off",
        service_data: {
          entity_id: ["light.bedroom", "light.kitchen"],
        },
      });
    });

    it("应该成功设置亮度", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.desk",
        action: "brightness",
        brightness: 75,
      };

      const mockResponse = { changed_states: [] };
      mockHassService.callServices.mockResolvedValue(mockResponse);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockHassService.callServices).toHaveBeenCalledWith({
        domain: "light",
        service: "turn_on",
        service_data: {
          entity_id: ["light.desk"],
          brightness: Math.round((75 / 100) * 255), // 191
        },
      });
    });

    it("应该成功设置RGB颜色", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.rgb_lamp",
        action: "color",
        color: { r: 255, g: 100, b: 50 },
      };

      const mockResponse = { changed_states: [] };
      mockHassService.callServices.mockResolvedValue(mockResponse);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockHassService.callServices).toHaveBeenCalledWith({
        domain: "light",
        service: "turn_on",
        service_data: {
          entity_id: ["light.rgb_lamp"],
          rgb_color: [255, 100, 50],
        },
      });
    });

    it("应该成功设置色温", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.ceiling",
        action: "temperature",
        temperature: 4000,
      };

      const mockResponse = { changed_states: [] };
      mockHassService.callServices.mockResolvedValue(mockResponse);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockHassService.callServices).toHaveBeenCalledWith({
        domain: "light",
        service: "turn_on",
        service_data: {
          entity_id: ["light.ceiling"],
          color_temp: Math.round(1000000 / 4000), // 250
        },
      });
    });

    it("应该成功应用场景模式", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.bedroom",
        action: "scene",
        scene: "reading",
      };

      const mockResponse = { changed_states: [] };
      mockHassService.callServices.mockResolvedValue(mockResponse);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(true);

      const expectedConfig = LightSceneConfigs.reading;
      expect(mockHassService.callServices).toHaveBeenCalledWith({
        domain: "light",
        service: "turn_on",
        service_data: {
          entity_id: ["light.bedroom"],
          brightness: Math.round((expectedConfig.brightness! / 100) * 255),
          color_temp: Math.round(1000000 / expectedConfig.temperature!),
          transition: expectedConfig.transition,
        },
      });
    });

    it("应该支持渐变效果", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.living_room",
        action: "turn_on",
        transition: 2.5,
      };

      const mockResponse = { changed_states: [] };
      mockHassService.callServices.mockResolvedValue(mockResponse);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockHassService.callServices).toHaveBeenCalledWith({
        domain: "light",
        service: "turn_on",
        service_data: {
          entity_id: ["light.living_room"],
          transition: 2.5,
        },
      });
    });

    it("应该处理亮度控制参数验证错误", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.test",
        action: "brightness",
        // 缺少 brightness 或 brightness_step 参数
      };

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toContain("INVALID_BRIGHTNESS");
      expect(result.affected_entities).toHaveLength(0);
    });

    it("应该处理亮度值超出范围错误", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.test",
        action: "brightness",
        brightness: 150, // 超出 1-100 范围
      };

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain("INVALID_BRIGHTNESS");
    });

    it("应该处理RGB颜色验证错误", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.test",
        action: "color",
        color: { r: 300, g: -10, b: 50 }, // 无效的RGB值
      };

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain("INVALID_COLOR");
    });

    it("应该处理色温值超出范围错误", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.test",
        action: "temperature",
        temperature: 10000, // 超出 2700K-6500K 范围
      };

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain("INVALID_TEMPERATURE");
    });

    it("应该处理服务调用失败", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.test",
        action: "turn_on",
      };

      const error = new Error("Network error");
      mockHassService.callServices.mockRejectedValue(error);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toContain("SERVICE_CALL_FAILED");
    });

    it("应该处理不支持的操作类型", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.test",
        // @ts-expect-error - 测试无效的 action 类型
        action: "invalid_action",
      };

      // Act
      const lightService = new LightControlService();
      const result = await lightService.controlLight(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain("UNSUPPORTED_ACTION");
    });
  });

  describe("getLightStatus", () => {
    const mockLightStates: HassState[] = [
      {
        entity_id: "light.living_room",
        state: "on",
        attributes: {
          friendly_name: "Living Room Light",
          brightness: 255,
          rgb_color: [255, 255, 255],
          color_temp: 300,
        },
        last_changed: "2024-01-01T12:00:00Z",
      },
      {
        entity_id: "light.bedroom",
        state: "off",
        attributes: {
          friendly_name: "Bedroom Light",
        },
        last_changed: "2024-01-01T11:00:00Z",
      },
      {
        entity_id: "switch.fan", // 非灯光设备
        state: "on",
        attributes: {
          friendly_name: "Ceiling Fan",
        },
        last_changed: "2024-01-01T10:00:00Z",
      },
    ];

    it("应该成功查询所有灯光状态", async () => {
      // Arrange
      const params: LightStatusQueryParams = {};

      mockHassService.getStates.mockResolvedValue(mockLightStates);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.getLightStatus(params);

      // Debug - 打印原始数据
      console.log("原始灯光状态:", mockLightStates[0].attributes);
      console.log("转换后的灯光信息:", result.lights[0]);

      // Assert
      expect(result.lights).toHaveLength(2); // 只有2个灯光设备
      expect(result.lights[0].entity_id).toBe("light.living_room");
      expect(result.lights[0].state).toBe("on");
      expect(result.lights[0].brightness).toBe(100); // 255/255*100
      expect(result.lights[1].entity_id).toBe("light.bedroom");
      expect(result.lights[1].state).toBe("off");
      expect(result.total_count).toBe(2);
      expect(result.groups).toBeUndefined();
    });

    it("应该成功查询单个灯光状态", async () => {
      // Arrange
      const params: LightStatusQueryParams = {
        entity_id: "light.living_room",
      };

      mockHassService.getStates.mockResolvedValue([mockLightStates[0]]);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.getLightStatus(params);

      // Assert
      expect(result.lights).toHaveLength(1);
      expect(result.lights[0].entity_id).toBe("light.living_room");
      expect(result.total_count).toBe(1);
    });

    it("应该支持按房间筛选", async () => {
      // Arrange
      const params: LightStatusQueryParams = {
        room: "living",
      };

      mockHassService.getStates.mockResolvedValue(mockLightStates);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.getLightStatus(params);

      // Assert
      expect(result.lights).toHaveLength(1);
      expect(result.lights[0].entity_id).toBe("light.living_room");
    });

    it("应该支持按房间分组", async () => {
      // Arrange
      const params: LightStatusQueryParams = {
        group_by: "room",
      };

      const mockStatesWithRooms = [
        ...mockLightStates,
        {
          entity_id: "light.kitchen_main",
          state: "on",
          attributes: { friendly_name: "Kitchen Main Light" },
          last_changed: "2024-01-01T12:00:00Z",
        },
      ];

      mockHassService.getStates.mockResolvedValue(mockStatesWithRooms);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.getLightStatus(params);

      // Assert
      expect(result.groups).toBeDefined();
      expect(Object.keys(result.groups!)).toContain("living");
      expect(Object.keys(result.groups!)).toContain("bedroom");
      expect(Object.keys(result.groups!)).toContain("kitchen");
    });

    it("应该支持不包含详细属性", async () => {
      // Arrange
      const params: LightStatusQueryParams = {
        include_attributes: false,
      };

      mockHassService.getStates.mockResolvedValue(mockLightStates);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.getLightStatus(params);

      // Assert
      expect(result.lights[0].brightness).toBeUndefined();
      expect(result.lights[0].color).toBeUndefined();
      expect(result.lights[0].temperature).toBeUndefined();
      expect(result.lights[0].attributes).toBeUndefined();
    });

    it("应该正确转换色温单位", async () => {
      // Arrange
      const params: LightStatusQueryParams = {};

      mockHassService.getStates.mockResolvedValue(mockLightStates);

      // Act
      const lightService = new LightControlService();
      const result = await lightService.getLightStatus(params);

      // Assert
      expect(result.lights[0].temperature).toBe(Math.round(1000000 / 300)); // 约3333K
    });

    it("应该处理查询失败", async () => {
      // Arrange
      const params: LightStatusQueryParams = {};

      const error = new Error("Query failed");
      mockHassService.getStates.mockRejectedValue(error);

      // Act & Assert
      const lightService = new LightControlService();
      await expect(lightService.getLightStatus(params)).rejects.toThrow(LightControlError);
    });
  });

  describe("参数转换", () => {
    it("应该正确解析多个实体ID", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.living_room, light.bedroom ,light.kitchen",
        action: "turn_on",
      };

      const mockResponse = { changed_states: [] };
      mockHassService.callServices.mockResolvedValue(mockResponse);

      // Act
      const lightService = new LightControlService();
      await lightService.controlLight(params);

      // Assert
      expect(mockHassService.callServices).toHaveBeenCalledWith({
        domain: "light",
        service: "turn_on",
        service_data: {
          entity_id: ["light.living_room", "light.bedroom", "light.kitchen"],
        },
      });
    });

    it("应该过滤空的实体ID", async () => {
      // Arrange
      const params: LightControlParams = {
        entity_id: "light.living_room,, ,light.bedroom",
        action: "turn_on",
      };

      const mockResponse = { changed_states: [] };
      mockHassService.callServices.mockResolvedValue(mockResponse);

      // Act
      const lightService = new LightControlService();
      await lightService.controlLight(params);

      // Assert
      expect(mockHassService.callServices).toHaveBeenCalledWith({
        domain: "light",
        service: "turn_on",
        service_data: {
          entity_id: ["light.living_room", "light.bedroom"],
        },
      });
    });
  });
});
