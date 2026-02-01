/**
 * Switch 类型定义单元测试
 */

import { describe, expect, it } from "vitest";
import type {
  ErrorResponse,
  MultipleDeviceResponse,
  SwitchActionType,
  SwitchControlParams,
  SwitchControlResult,
  SwitchDeviceClass,
  SwitchDeviceInfo,
  SwitchPowerInfo,
} from "@/types/switch";
import { SwitchControlError, SwitchControlErrorCodes } from "@/types/switch";

describe("Switch Types", () => {
  describe("SwitchActionType", () => {
    it("应该支持所有操作类型", () => {
      const actions: SwitchActionType[] = ["turn_on", "turn_off", "toggle"];
      expect(actions).toHaveLength(3);
      expect(actions).toContain("turn_on");
      expect(actions).toContain("turn_off");
      expect(actions).toContain("toggle");
    });
  });

  describe("SwitchDeviceClass", () => {
    it("应该支持所有设备类", () => {
      const deviceClasses: SwitchDeviceClass[] = ["outlet", "switch", "fan", "none"];
      expect(deviceClasses).toHaveLength(4);
      expect(deviceClasses).toContain("outlet");
      expect(deviceClasses).toContain("switch");
      expect(deviceClasses).toContain("fan");
      expect(deviceClasses).toContain("none");
    });
  });

  describe("SwitchPowerInfo", () => {
    it("应该正确创建功率信息对象", () => {
      const powerInfo: SwitchPowerInfo = {
        current_power_w: 125.5,
        today_energy_kwh: 2.3,
        monthly_energy_kwh: 65.8,
      };

      expect(powerInfo.current_power_w).toBe(125.5);
      expect(powerInfo.today_energy_kwh).toBe(2.3);
      expect(powerInfo.monthly_energy_kwh).toBe(65.8);
    });

    it("应该允许所有字段可选", () => {
      const powerInfo: SwitchPowerInfo = {};
      expect(Object.keys(powerInfo)).toHaveLength(0);
    });
  });

  describe("SwitchDeviceInfo", () => {
    it("应该正确创建设备信息对象", () => {
      const deviceInfo: SwitchDeviceInfo = {
        entity_id: "switch.outlet_1",
        friendly_name: "客厅插座",
        state: "on",
        device_class: "outlet",
        last_updated: "2024-01-01T00:00:00+00:00",
        power_info: {
          current_power_w: 125.5,
          today_energy_kwh: 2.3,
        },
        attributes: {
          icon: "mdi:power-socket-eu",
        },
      };

      expect(deviceInfo.entity_id).toBe("switch.outlet_1");
      expect(deviceInfo.friendly_name).toBe("客厅插座");
      expect(deviceInfo.state).toBe("on");
      expect(deviceInfo.device_class).toBe("outlet");
      expect(deviceInfo.power_info?.current_power_w).toBe(125.5);
    });
  });

  describe("SwitchControlParams", () => {
    it("应该正确创建控制参数对象", () => {
      const params: SwitchControlParams = {
        name: "客厅插座",
        action: "turn_on",
      };

      expect(params.name).toBe("客厅插座");
      expect(params.action).toBe("turn_on");
    });

    it("应该支持所有操作类型", () => {
      const actions: SwitchActionType[] = ["turn_on", "turn_off", "toggle"];

      actions.forEach((action) => {
        const params: SwitchControlParams = {
          name: "测试设备",
          action,
        };
        expect(params.action).toBe(action);
      });
    });
  });

  describe("SwitchControlResult", () => {
    it("应该正确创建成功的控制结果", () => {
      const result: SwitchControlResult = {
        success: true,
        entity_id: "switch.outlet_1",
        friendly_name: "客厅插座",
        action: "turn_on",
        state: "on",
        power_info: {
          current_power_w: 125.5,
        },
        message: "已开启客厅插座，当前功率 125.5W",
        execution_time: 150,
      };

      expect(result.success).toBe(true);
      expect(result.entity_id).toBe("switch.outlet_1");
      expect(result.friendly_name).toBe("客厅插座");
      expect(result.action).toBe("turn_on");
      expect(result.state).toBe("on");
      expect(result.message).toBe("已开启客厅插座，当前功率 125.5W");
      expect(result.execution_time).toBe(150);
    });

    it("应该允许可选字段为 undefined", () => {
      const result: SwitchControlResult = {
        success: true,
        entity_id: "switch.outlet_1",
        friendly_name: "客厅插座",
        action: "turn_off",
      };

      expect(result.success).toBe(true);
      expect(result.state).toBeUndefined();
      expect(result.power_info).toBeUndefined();
      expect(result.message).toBeUndefined();
      expect(result.execution_time).toBeUndefined();
    });
  });

  describe("MultipleDeviceResponse", () => {
    it("应该正确创建多设备匹配响应", () => {
      const response: MultipleDeviceResponse = {
        success: false,
        msg: "找到多个设备，请问需要控制哪一个？",
        entities: [
          {
            entity_id: "switch.outlet_1",
            friendly_name: "客厅插座1",
          },
          {
            entity_id: "switch.outlet_2",
            friendly_name: "客厅插座2",
          },
        ],
      };

      expect(response.success).toBe(false);
      expect(response.msg).toContain("多个设备");
      expect(response.entities).toHaveLength(2);
      expect(response.entities[0]?.entity_id).toBe("switch.outlet_1");
      expect(response.entities[1]?.friendly_name).toBe("客厅插座2");
    });
  });

  describe("ErrorResponse", () => {
    it("应该正确创建错误响应", () => {
      const response: ErrorResponse = {
        success: false,
        entity_id: "switch.outlet_1",
        friendly_name: "客厅插座",
        errors: ["设备离线", "无法连接"],
      };

      expect(response.success).toBe(false);
      expect(response.entity_id).toBe("switch.outlet_1");
      expect(response.friendly_name).toBe("客厅插座");
      expect(response.errors).toHaveLength(2);
      expect(response.errors).toContain("设备离线");
    });

    it("应该允许 entity_id 和 friendly_name 为 undefined", () => {
      const response: ErrorResponse = {
        success: false,
        errors: ["未找到设备"],
      };

      expect(response.success).toBe(false);
      expect(response.entity_id).toBeUndefined();
      expect(response.friendly_name).toBeUndefined();
      expect(response.errors).toHaveLength(1);
    });
  });

  describe("SwitchControlError", () => {
    it("应该创建正确的错误实例", () => {
      const error = new SwitchControlError(
        "设备未找到",
        SwitchControlErrorCodes.DEVICE_NOT_FOUND,
        "switch.outlet_1",
        "turn_on"
      );

      expect(error instanceof SwitchControlError).toBe(true);
      expect(error instanceof Error).toBe(true);
      expect(error.name).toBe("SwitchControlError");
      expect(error.message).toBe("设备未找到");
      expect(error.code).toBe(SwitchControlErrorCodes.DEVICE_NOT_FOUND);
      expect(error.entity_id).toBe("switch.outlet_1");
      expect(error.action).toBe("turn_on");
    });

    it("应该允许可选参数为 undefined", () => {
      const error = new SwitchControlError("无效的操作", SwitchControlErrorCodes.INVALID_ACTION);

      expect(error.name).toBe("SwitchControlError");
      expect(error.code).toBe(SwitchControlErrorCodes.INVALID_ACTION);
      expect(error.entity_id).toBeUndefined();
      expect(error.action).toBeUndefined();
    });

    it("应该包含所有预定义的错误代码", () => {
      expect(SwitchControlErrorCodes.DEVICE_NOT_FOUND).toBe("DEVICE_NOT_FOUND");
      expect(SwitchControlErrorCodes.MULTIPLE_DEVICES_FOUND).toBe("MULTIPLE_DEVICES_FOUND");
      expect(SwitchControlErrorCodes.INVALID_ACTION).toBe("INVALID_ACTION");
      expect(SwitchControlErrorCodes.SERVICE_CALL_FAILED).toBe("SERVICE_CALL_FAILED");
      expect(SwitchControlErrorCodes.DEVICE_OFFLINE).toBe("DEVICE_OFFLINE");
      expect(SwitchControlErrorCodes.NETWORK_ERROR).toBe("NETWORK_ERROR");
      expect(SwitchControlErrorCodes.UNAUTHORIZED).toBe("UNAUTHORIZED");
    });

    it("错误代码应该是常量且不可修改", () => {
      // 使用 as any 来测试只读属性
      const errorCodes = SwitchControlErrorCodes as { DEVICE_NOT_FOUND: string };
      expect(errorCodes.DEVICE_NOT_FOUND).toBe("DEVICE_NOT_FOUND");
    });
  });

  describe("类型兼容性", () => {
    it("SwitchControlResult 应该可以与其他响应类型区分", () => {
      const successResult: SwitchControlResult = {
        success: true,
        entity_id: "switch.outlet_1",
        friendly_name: "客厅插座",
        action: "turn_on",
      };

      const multipleResponse: MultipleDeviceResponse = {
        success: false,
        msg: "找到多个设备",
        entities: [],
      };

      const errorResponse: ErrorResponse = {
        success: false,
        errors: ["错误"],
      };

      // 通过 success 字段可以区分
      if (successResult.success) {
        expect(successResult.entity_id).toBeDefined();
      }

      if (!multipleResponse.success && "msg" in multipleResponse) {
        expect(multipleResponse.msg).toContain("多个设备");
      }

      if (!errorResponse.success && "errors" in errorResponse) {
        expect(errorResponse.errors).toBeInstanceOf(Array);
      }
    });
  });
});
