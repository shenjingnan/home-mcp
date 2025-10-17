import { describe, expect, it } from "vitest";
import {
  LightControlError,
  LightControlErrorCodes,
  type LightControlParams,
  type LightControlResult,
  type LightDeviceInfo,
  LightSceneConfigs,
  type LightStatusQueryParams,
  type LightStatusResult,
  type RGBColor,
} from "./light";

describe("Light Types", () => {
  describe("LightControlError", () => {
    it("应该创建正确的错误实例", () => {
      const error = new LightControlError(
        "Test error message",
        LightControlErrorCodes.INVALID_BRIGHTNESS,
        "light.test",
        "brightness",
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("LightControlError");
      expect(error.message).toBe("Test error message");
      expect(error.code).toBe(LightControlErrorCodes.INVALID_BRIGHTNESS);
      expect(error.entity_id).toBe("light.test");
      expect(error.action).toBe("brightness");
    });
  });

  describe("LightSceneConfigs", () => {
    it("应该包含所有预定义场景", () => {
      const expectedScenes = ["reading", "relaxing", "working", "party", "sleeping", "movie", "dinner", "romantic"];

      expectedScenes.forEach((scene) => {
        expect(LightSceneConfigs[scene as keyof typeof LightSceneConfigs]).toBeDefined();
        expect(LightSceneConfigs[scene as keyof typeof LightSceneConfigs].name).toBe(scene);
      });
    });

    it("所有场景配置应该包含必要的字段", () => {
      Object.values(LightSceneConfigs).forEach((config) => {
        expect(config).toHaveProperty("name");
        expect(config).toHaveProperty("display_name");
        expect(config).toHaveProperty("description");

        // 验证数值范围
        if (config.brightness !== undefined) {
          expect(config.brightness).toBeGreaterThanOrEqual(1);
          expect(config.brightness).toBeLessThanOrEqual(100);
        }

        if (config.temperature !== undefined) {
          expect(config.temperature).toBeGreaterThanOrEqual(2700);
          expect(config.temperature).toBeLessThanOrEqual(6500);
        }

        if (config.transition !== undefined) {
          expect(config.transition).toBeGreaterThanOrEqual(0.1);
          expect(config.transition).toBeLessThanOrEqual(60);
        }

        if (config.color !== undefined) {
          expect(config.color.r).toBeGreaterThanOrEqual(0);
          expect(config.color.r).toBeLessThanOrEqual(255);
          expect(config.color.g).toBeGreaterThanOrEqual(0);
          expect(config.color.g).toBeLessThanOrEqual(255);
          expect(config.color.b).toBeGreaterThanOrEqual(0);
          expect(config.color.b).toBeLessThanOrEqual(255);
        }
      });
    });
  });

  describe("类型兼容性", () => {
    it("LightControlParams 应该接受有效的参数", () => {
      const validParams: LightControlParams = {
        entity_id: "light.test",
        action: "turn_on",
        brightness: 75,
        color: { r: 255, g: 128, b: 64 },
        temperature: 4000,
        transition: 2.5,
        flash: "short",
      };

      expect(validParams.entity_id).toBe("light.test");
      expect(validParams.action).toBe("turn_on");
    });

    it("LightStatusQueryParams 应该接受有效的参数", () => {
      const validParams: LightStatusQueryParams = {
        entity_id: "light.test",
        room: "living",
        include_attributes: true,
        group_by: "room",
      };

      expect(validParams.entity_id).toBe("light.test");
      expect(validParams.group_by).toBe("room");
    });

    it("LightDeviceInfo 应该接受有效的设备信息", () => {
      const deviceInfo: LightDeviceInfo = {
        entity_id: "light.test",
        friendly_name: "Test Light",
        state: "on",
        brightness: 80,
        color: { r: 255, g: 255, b: 255 },
        temperature: 4000,
        last_updated: "2024-01-01T12:00:00Z",
        attributes: { custom_attr: "value" },
      };

      expect(deviceInfo.entity_id).toBe("light.test");
      expect(deviceInfo.state).toBe("on");
    });

    it("LightControlResult 应该接受有效的结果", () => {
      const result: LightControlResult = {
        success: true,
        affected_entities: ["light.test"],
        updated_states: [],
        execution_time: 150,
      };

      expect(result.success).toBe(true);
      expect(result.affected_entities).toContain("light.test");
    });

    it("LightStatusResult 应该接受有效的状态结果", () => {
      const result: LightStatusResult = {
        lights: [
          {
            entity_id: "light.test",
            state: "on",
            last_updated: "2024-01-01T12:00:00Z",
          },
        ],
        total_count: 1,
        groups: {
          living: [
            {
              entity_id: "light.test",
              state: "on",
              last_updated: "2024-01-01T12:00:00Z",
            },
          ],
        },
      };

      expect(result.lights).toHaveLength(1);
      expect(result.total_count).toBe(1);
      expect(result.groups?.["living"]).toBeDefined();
    });
  });

  describe("RGBColor 类型", () => {
    it("应该接受有效的RGB值", () => {
      const validColors: RGBColor[] = [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
        { r: 128, g: 64, b: 192 },
        { r: 255, g: 0, b: 128 },
      ];

      validColors.forEach((color) => {
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
      });
    });
  });

  describe("LightControlErrorCodes", () => {
    it("应该包含所有预定义的错误代码", () => {
      const expectedCodes = [
        "INVALID_ENTITY_ID",
        "INVALID_BRIGHTNESS",
        "INVALID_COLOR",
        "INVALID_TEMPERATURE",
        "INVALID_ACTION",
        "SERVICE_CALL_FAILED",
        "NETWORK_ERROR",
        "UNAUTHORIZED",
        "ENTITY_NOT_FOUND",
        "UNSUPPORTED_ACTION",
      ];

      expectedCodes.forEach((code) => {
        expect(LightControlErrorCodes[code as keyof typeof LightControlErrorCodes]).toBeDefined();
      });
    });

    it("所有错误代码应该是唯一的", () => {
      const codes = Object.values(LightControlErrorCodes);
      const uniqueCodes = [...new Set(codes)];

      expect(codes).toHaveLength(uniqueCodes.length);
    });
  });
});
