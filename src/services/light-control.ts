import { Param, Tool } from "bestmcp";
import { z } from "zod";
import type { HassState } from "../types";
import {
  type HassLightServiceParams,
  LightControlError,
  LightControlErrorCodes,
  type LightControlParams,
  type LightControlResult,
  type LightDeviceInfo,
  LightSceneConfigs,
  type LightStatusQueryParams,
  type LightStatusResult,
} from "../types/light";

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

export class LightControlService {
  private static hassServiceInstance: IHassService | null = null;

  // 设置 HassService 实例（在注册前调用）
  static setHassService(hassService: IHassService) {
    LightControlService.hassServiceInstance = hassService;
  }

  private getHassService() {
    if (!LightControlService.hassServiceInstance) {
      throw new Error("HassService 实例未设置，请先调用 LightControlService.setHassService()");
    }
    return LightControlService.hassServiceInstance;
  }

  /**
   * 控制灯光设备的主工具方法
   * 支持开关、亮度、颜色、色温调节和场景模式
   */
  @Tool("控制灯光设备 - 支持开关、亮度、颜色、色温调节和场景模式")
  async controlLight(
    @Param(
      z.object({
        // 基础参数
        entity_id: z.string().describe("灯光设备的实体ID，如 'light.living_room' 或多个设备用逗号分隔"),
        action: z
          .enum([
            "turn_on",
            "turn_off",
            "toggle", // 开关控制
            "brightness",
            "color",
            "temperature", // 参数调节
            "scene", // 场景模式
          ])
          .describe("要执行的灯光控制操作类型"),

        // 亮度控制参数
        brightness: z.number().min(1).max(100).optional().describe("亮度百分比 (1-100)，当action为brightness时需要"),
        brightness_step: z.number().optional().describe("亮度增减步长 (-100到100)，正值增加亮度，负值减少亮度"),

        // 颜色控制参数
        color: z
          .object({
            r: z.number().min(0).max(255).describe("红色分量 (0-255)"),
            g: z.number().min(0).max(255).describe("绿色分量 (0-255)"),
            b: z.number().min(0).max(255).describe("蓝色分量 (0-255)"),
          })
          .optional()
          .describe("RGB颜色值，当action为color时需要"),

        // 色温控制参数
        temperature: z
          .number()
          .min(2700)
          .max(6500)
          .optional()
          .describe("色温值(2700K-6500K)，当action为temperature时需要"),
        temperature_step: z.number().optional().describe("色温增减步长，正值增加色温(更冷)，负值降低色温(更暖)"),

        // 场景模式参数
        scene: z
          .enum(["reading", "relaxing", "working", "party", "sleeping", "movie", "dinner", "romantic"])
          .optional()
          .describe("预设场景模式，当action为scene时需要"),

        // 渐变效果参数
        transition: z.number().min(0.1).max(60).optional().describe("渐变时间(秒)，支持0.1-60秒的平滑过渡效果"),

        // 扩展参数
        flash: z.enum(["short", "long"]).optional().describe("闪烁效果，short为短闪，long为长闪"),
        effect: z.string().optional().describe("特殊效果名称，如支持的自定义效果"),
      }),
    )
    params: LightControlParams,
  ): Promise<LightControlResult> {
    const startTime = Date.now();
    const affectedEntities: string[] = [];
    const errors: string[] = [];

    try {
      // 解析实体ID列表
      const entityIds = this.parseEntityIds(params.entity_id);

      // 验证参数
      this.validateParams(params);

      // 根据操作类型执行相应的控制逻辑
      const results = await this.executeLightAction(entityIds, params);

      // 收集受影响的实体
      affectedEntities.push(...entityIds);

      // 计算执行时间
      const executionTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        affected_entities: affectedEntities,
        updated_states: results,
        ...(errors.length > 0 ? { errors } : {}),
        execution_time: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof LightControlError) {
        errors.push(`${error.code}: ${error.message}`);
      } else if (error instanceof Error) {
        errors.push(`UNKNOWN_ERROR: ${error.message}`);
      }

      return {
        success: false,
        affected_entities: affectedEntities,
        updated_states: [],
        errors,
        execution_time: executionTime,
      };
    }
  }

  /**
   * 查询灯光设备状态
   */
  @Tool("查询灯光设备状态 - 获取单个或多个灯光设备的详细状态信息")
  async getLightStatus(
    @Param(
      z.object({
        entity_id: z.string().optional().describe("灯光设备实体ID，不填则查询所有灯光设备"),
        room: z.string().optional().describe("房间名称筛选，支持模糊匹配如'客厅'、'卧室'"),
        include_attributes: z.boolean().optional().default(true).describe("是否包含详细属性信息如颜色、色温、亮度等"),
        group_by: z
          .enum(["room", "type", "none"])
          .optional()
          .default("none")
          .describe("分组方式：room按房间分组，type按设备类型分组，none不分组"),
      }),
    )
    params: LightStatusQueryParams,
  ): Promise<LightStatusResult> {
    try {
      const hassService = this.getHassService();

      // 获取所有状态或指定实体状态
      const allStates = params.entity_id
        ? await hassService.getStates({ entity_id: params.entity_id })
        : await hassService.getStates();

      // 筛选灯光设备
      const lightStates = allStates.filter((state: HassState) => state.entity_id.startsWith("light."));

      // 应用房间筛选
      let filteredStates = lightStates;
      if (params.room) {
        filteredStates = lightStates.filter((state: HassState) => this.matchesRoom(state, params.room!));
      }

      // 转换为灯光设备信息
      const includeAttributes = params.include_attributes !== false; // 默认为 true
      const lights: LightDeviceInfo[] = filteredStates.map((state: HassState) =>
        this.convertToLightDeviceInfo(state, includeAttributes),
      );

      // 应用分组
      const groupBy = params.group_by || "none"; // 默认为 'none'
      const groups = this.applyGrouping(lights, groupBy);

      return {
        lights,
        ...(Object.keys(groups).length > 0 ? { groups } : {}),
        total_count: lights.length,
      };
    } catch (error) {
      throw new LightControlError(
        `查询灯光状态失败: ${error instanceof Error ? error.message : "未知错误"}`,
        "QUERY_FAILED",
      );
    }
  }

  /**
   * 解析实体ID字符串，支持逗号分隔的多个实体
   */
  private parseEntityIds(entityId: string): string[] {
    return entityId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }

  /**
   * 验证控制参数
   */
  private validateParams(params: LightControlParams): void {
    // 验证亮度参数
    if (params.action === "brightness" && !params.brightness && !params.brightness_step) {
      throw new LightControlError(
        "亮度控制需要指定 brightness 或 brightness_step 参数",
        LightControlErrorCodes.INVALID_BRIGHTNESS,
        params.entity_id,
        params.action,
      );
    }

    if (params.brightness !== undefined && (params.brightness < 1 || params.brightness > 100)) {
      throw new LightControlError(
        "亮度值必须在 1-100 之间",
        LightControlErrorCodes.INVALID_BRIGHTNESS,
        params.entity_id,
        params.action,
      );
    }

    // 验证颜色参数
    if (params.action === "color" && !params.color) {
      throw new LightControlError(
        "颜色控制需要指定 color 参数",
        LightControlErrorCodes.INVALID_COLOR,
        params.entity_id,
        params.action,
      );
    }

    if (params.color) {
      const { r, g, b } = params.color;
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        throw new LightControlError(
          "RGB颜色值必须在 0-255 之间",
          LightControlErrorCodes.INVALID_COLOR,
          params.entity_id,
          params.action,
        );
      }
    }

    // 验证色温参数
    if (params.action === "temperature" && !params.temperature && !params.temperature_step) {
      throw new LightControlError(
        "色温控制需要指定 temperature 或 temperature_step 参数",
        LightControlErrorCodes.INVALID_TEMPERATURE,
        params.entity_id,
        params.action,
      );
    }

    if (params.temperature !== undefined && (params.temperature < 2700 || params.temperature > 6500)) {
      throw new LightControlError(
        "色温值必须在 2700K-6500K 之间",
        LightControlErrorCodes.INVALID_TEMPERATURE,
        params.entity_id,
        params.action,
      );
    }

    // 验证场景参数
    if (params.action === "scene" && !params.scene) {
      throw new LightControlError(
        "场景模式需要指定 scene 参数",
        LightControlErrorCodes.INVALID_ACTION,
        params.entity_id,
        params.action,
      );
    }
  }

  /**
   * 执行灯光控制动作
   */
  private async executeLightAction(entityIds: string[], params: LightControlParams): Promise<HassState[]> {
    const serviceParams = this.convertToHassServiceParams(params);
    const domain = "light";

    let service: string;
    switch (params.action) {
      case "turn_on":
      case "turn_off":
      case "toggle":
        service = params.action;
        break;
      case "brightness":
      case "color":
      case "temperature":
      case "scene":
        service = "turn_on"; // 这些操作都是通过 turn_on 服务配合不同参数实现
        break;
      default:
        throw new LightControlError(
          `不支持的操作类型: ${params.action}`,
          LightControlErrorCodes.UNSUPPORTED_ACTION,
          params.entity_id,
          params.action,
        );
    }

    const hassService = this.getHassService();

    try {
      // 调用 Home Assistant 服务
      const result = await hassService.callServices({
        domain,
        service,
        service_data: {
          entity_id: entityIds,
          ...serviceParams,
        },
      });

      return result.changed_states || [];
    } catch (error) {
      throw new LightControlError(
        `服务调用失败: ${error instanceof Error ? error.message : "未知错误"}`,
        LightControlErrorCodes.SERVICE_CALL_FAILED,
        params.entity_id,
        params.action,
      );
    }
  }

  /**
   * 将灯光控制参数转换为 Home Assistant 服务参数
   */
  private convertToHassServiceParams(params: LightControlParams): HassLightServiceParams {
    const serviceParams: HassLightServiceParams = {};

    // 处理渐变效果
    if (params.transition !== undefined) {
      serviceParams.transition = params.transition;
    }

    // 处理闪烁效果
    if (params.flash !== undefined) {
      serviceParams.flash = params.flash;
    }

    // 处理特殊效果
    if (params.effect !== undefined) {
      serviceParams.effect = params.effect;
    }

    // 根据操作类型设置特定参数
    switch (params.action) {
      case "turn_on":
        // 开灯时不设置特定参数，保持现有状态
        break;

      case "turn_off":
      case "toggle":
        // 关灯和切换不需要额外参数
        break;

      case "brightness":
        if (params.brightness !== undefined) {
          // 将百分比转换为 Home Assistant 的 0-255 范围
          serviceParams.brightness = Math.round((params.brightness / 100) * 255);
        }
        break;

      case "color":
        if (params.color) {
          serviceParams.rgb_color = [params.color.r, params.color.g, params.color.b];
        }
        break;

      case "temperature":
        if (params.temperature !== undefined) {
          // 将色温从 Kelvin 转换为 mired
          serviceParams.color_temp = Math.round(1000000 / params.temperature);
        }
        break;

      case "scene":
        if (params.scene) {
          const sceneConfig = LightSceneConfigs[params.scene];
          if (sceneConfig.brightness) {
            serviceParams.brightness = Math.round((sceneConfig.brightness / 100) * 255);
          }
          if (sceneConfig.color) {
            serviceParams.rgb_color = [sceneConfig.color.r, sceneConfig.color.g, sceneConfig.color.b];
          }
          if (sceneConfig.temperature) {
            serviceParams.color_temp = Math.round(1000000 / sceneConfig.temperature);
          }
          if (sceneConfig.transition) {
            serviceParams.transition = sceneConfig.transition;
          }
        }
        break;
    }

    return serviceParams;
  }

  /**
   * 将 HassState 转换为 LightDeviceInfo
   */
  private convertToLightDeviceInfo(state: HassState, includeAttributes: boolean): LightDeviceInfo {
    const deviceInfo: LightDeviceInfo = {
      entity_id: state.entity_id,
      friendly_name: state.attributes?.["friendly_name"] as string,
      state: state.state as "on" | "off",
      last_updated: state.last_changed,
    };

    if (includeAttributes && state.attributes) {
      // 提取亮度信息
      if (state.attributes["brightness"] !== undefined) {
        deviceInfo.brightness = Math.round(((state.attributes["brightness"] as number) / 255) * 100);
      }

      // 提取颜色信息
      if (state.attributes["rgb_color"]) {
        const [r, g, b] = state.attributes["rgb_color"] as number[];
        if (r !== undefined && g !== undefined && b !== undefined) {
          deviceInfo.color = { r, g, b };
        }
      }

      // 提取色温信息
      if (state.attributes["color_temp"] !== undefined) {
        // 将 mired 转换为 Kelvin
        deviceInfo.temperature = Math.round(1000000 / (state.attributes["color_temp"] as number));
      }

      // 保存所有属性
      deviceInfo.attributes = state.attributes;
    }

    return deviceInfo;
  }

  /**
   * 检查设备是否匹配房间筛选条件
   */
  private matchesRoom(state: HassState, roomFilter: string): boolean {
    const friendlyName = (state.attributes?.["friendly_name"] as string) || "";
    const entityId = state.entity_id;

    // 支持多种匹配方式：
    // 1. 实体ID中包含房间名称
    // 2. 友好名称中包含房间名称
    return (
      entityId.toLowerCase().includes(roomFilter.toLowerCase()) ||
      friendlyName.toLowerCase().includes(roomFilter.toLowerCase())
    );
  }

  /**
   * 对灯光设备进行分组
   */
  private applyGrouping(
    lights: LightDeviceInfo[],
    groupBy: "room" | "type" | "none",
  ): Record<string, Array<LightDeviceInfo>> {
    if (groupBy === "none") {
      return {};
    }

    const groups: Record<string, Array<LightDeviceInfo>> = {};

    for (const light of lights) {
      let groupName = "";

      if (groupBy === "room") {
        // 从实体ID或友好名称中提取房间信息
        const parts = light.entity_id.split(".");
        if (parts.length > 1) {
          const entityPart = parts[1];
          if (entityPart) {
            const roomMatch = entityPart.match(/^(.+?)(?:_|$)/);
            groupName = roomMatch?.[1] || "unknown";
          }
        }
      } else if (groupBy === "type") {
        // 根据设备类型分组（这里简化处理，可以根据实际需求扩展）
        groupName = "light";
      }

      if (groupName && !groups[groupName]) {
        groups[groupName] = [];
      }
      if (groupName) {
        groups[groupName]!.push(light);
      }
    }

    return groups;
  }
}
