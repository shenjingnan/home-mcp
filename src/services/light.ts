import { Param, Tool } from "bestmcp";
import { z } from "zod";
import type { HassState, ServiceData } from "@/types";

/**
 * 灯光控制服务类
 * 提供语义化的灯光控制功能，封装 Home Assistant Light API 调用
 */
interface IHassService {
  getStates(params?: { entity_id?: string }): Promise<HassState[]>;
  callServices(params: { domain: string; service: string; service_data: Record<string, unknown> }): Promise<{
    changed_states?: HassState[];
  }>;
}

export class LightService {
  private static hassServiceInstance: IHassService | null = null;

  // 设置 HassService 实例（在注册前调用）
  public static setHassService(hassService: IHassService) {
    LightService.hassServiceInstance = hassService;
  }

  /**
   * 通过名称控制灯光设备
   * @param name 灯光设备名称
   * @param action 控制动作 枚举值：turn_on | turn_off
   * @param brightnessPct 亮度百分比 (1-100)，可选参数
   * @param temperature_pct 色温百分比 (1-100)，基于设备支持的色温范围，可选参数
   */
  @Tool("控制灯光设备 - 支持通过名称控制灯光设备的开关、亮度和色温")
  public async LightControl(
    @Param(z.string().describe("灯光设备名称"))
    name: string,
    @Param(z.enum(["turn_on", "turn_off"]).describe("控制动作 枚举值：turn_on | turn_off"))
    action: "turn_on" | "turn_off",
    @Param(z.number().min(1).max(100).optional().describe("亮度百分比 (1-100)，可选参数"))
    brightnessPct?: number,
    @Param(z.number().min(1).max(100).optional().describe("色温百分比 (1-100)，基于设备支持的色温范围，可选参数"))
    temperaturePct?: number
  ) {
    const hassService = this.getHassService();

    // 查找匹配的设备
    const entities = await this.getEntitiesByName(name);
    if (entities.length <= 0) {
      return "没有找到可以控制的设备";
    }

    // 如果找到多个设备，返回选项让用户选择
    if (entities.length > 1) {
      return {
        msg: "找到多个设备，请问需要控制哪一个？",
        entities: entities.map((entity) => ({
          entity_id: entity.entity_id,
          friendly_name: entity.attributes.friendly_name || entity.entity_id,
        })),
      };
    }

    const selectedEntity = entities[0]!;
    const entityId = selectedEntity.entity_id;

    // 检查设备能力
    const capabilities = this.checkDeviceCapabilities(selectedEntity);

    // 验证参数并提供友好的错误提示
    const errors: string[] = [];

    // 验证亮度参数
    if (brightnessPct !== undefined) {
      if (!capabilities.supportsBrightness) {
        errors.push(`设备 ${selectedEntity.attributes.friendly_name || entityId} 不支持亮度调节`);
      }
    }

    // 验证色温参数
    if (temperaturePct !== undefined) {
      if (!capabilities.supportsColorTemp) {
        errors.push(`设备 ${selectedEntity.attributes.friendly_name || entityId} 不支持色温调节`);
      } else if (!capabilities.minColorTemp || !capabilities.maxColorTemp) {
        errors.push(`无法获取设备 ${selectedEntity.attributes.friendly_name || entityId} 的色温范围信息`);
      }
    }

    // 如果有错误，返回错误信息
    if (errors.length > 0) {
      return {
        success: false,
        entity_id: entityId,
        errors,
        friendly_name: selectedEntity.attributes.friendly_name || entityId,
      };
    }

    try {
      // 构建服务调用参数
      const serviceData: ServiceData = {
        entity_id: entityId,
      };

      // 如果是开灯操作，添加控制参数
      if (action === "turn_on") {
        // 添加亮度控制
        if (brightnessPct !== undefined && capabilities.supportsBrightness) {
          serviceData.brightness = this.convertBrightnessPercentage(brightnessPct);
        }

        // 添加色温控制
        if (
          temperaturePct !== undefined &&
          capabilities.supportsColorTemp &&
          capabilities.minColorTemp &&
          capabilities.maxColorTemp
        ) {
          const kelvinTemp = this.convertTemperaturePercentage(
            temperaturePct,
            capabilities.minColorTemp,
            capabilities.maxColorTemp
          );
          serviceData.color_temp_kelvin = kelvinTemp;
        }
      }

      // 调用 Home Assistant 服务
      const result = await hassService.callServices({
        domain: "light",
        service: action,
        service_data: serviceData,
      });

      // 返回成功结果
      return {
        success: true,
        entity_id: entityId,
        friendly_name: selectedEntity.attributes.friendly_name || entityId,
        action,
        ...(brightnessPct !== undefined ? { brightness_pct: brightnessPct } : {}),
        ...(temperaturePct !== undefined ? { temperature_pct: temperaturePct } : {}),
        changed_states: result.changed_states || [],
        message: `成功${action === "turn_on" ? "开启" : "关闭"}设备 ${
          selectedEntity.attributes.friendly_name || entityId
        }${brightnessPct ? `，亮度设置为 ${brightnessPct}%` : ""}${
          temperaturePct ? `，色温设置为 ${temperaturePct}%` : ""
        }`,
      };
    } catch (error) {
      return {
        success: false,
        entity_id: entityId,
        friendly_name: selectedEntity.attributes.friendly_name || entityId,
        errors: [`控制失败: ${error instanceof Error ? error.message : "未知错误"}`],
      };
    }
  }

  private getHassService() {
    if (!LightService.hassServiceInstance) {
      throw new Error("HassService 实例未设置，请先调用 LightControlService.setHassService()");
    }
    return LightService.hassServiceInstance;
  }

  private async getEntitiesByName(name: string): Promise<HassState[]> {
    const hassService = this.getHassService();
    const allStates = await hassService.getStates();
    const filteredStates = allStates.filter((state: HassState) => state.attributes.friendly_name?.includes(name));
    return filteredStates;
  }

  /**
   * 将亮度百分比转换为 Home Assistant 使用的 0-255 值
   */
  private convertBrightnessPercentage(brightnessPct: number): number {
    return Math.round((brightnessPct / 100) * 255);
  }

  /**
   * 将色温百分比转换为设备的实际色温值
   */
  private convertTemperaturePercentage(temperaturePct: number, minTemp: number, maxTemp: number): number {
    // 计算色温范围
    const range = maxTemp - minTemp;
    // 计算实际色温值
    return Math.round(minTemp + (temperaturePct / 100) * range);
  }

  /**
   * 检查设备是否支持特定功能
   */
  private checkDeviceCapabilities(entity: HassState): {
    supportsBrightness: boolean;
    supportsColorTemp: boolean;
    supportsColor: boolean;
    minColorTemp?: number;
    maxColorTemp?: number;
  } {
    const attributes = entity.attributes;
    const supportedColorModes = attributes.supported_color_modes;

    return {
      supportsBrightness: true, // 大部分灯光都支持亮度调节
      supportsColorTemp: Array.isArray(supportedColorModes) && (supportedColorModes as string[]).includes("color_temp"),
      supportsColor:
        Array.isArray(supportedColorModes) &&
        ((supportedColorModes as string[]).includes("rgb") || (supportedColorModes as string[]).includes("hs")),
      minColorTemp: attributes.min_color_temp_kelvin as number,
      maxColorTemp: attributes.max_color_temp_kelvin as number,
    };
  }
}
