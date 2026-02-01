/**
 * Switch 控制服务类
 * 提供语义化的开关设备控制功能，封装 Home Assistant Switch API 调用
 */

import { Param, Tool } from "bestmcp";
import { z } from "zod";
import type { HassState } from "@/types";
import type {
  ErrorResponse,
  MultipleDeviceResponse,
  SwitchActionType,
  SwitchControlResult,
  SwitchPowerInfo,
} from "@/types/switch";

/**
 * Home Assistant 服务接口
 */
interface IHassService {
  getStates(params?: { entity_id?: string }): Promise<HassState[]>;
  callServices(params: {
    domain: string;
    service: string;
    service_data: Record<string, unknown>;
  }): Promise<{ changed_states?: HassState[] }>;
}

/**
 * Switch 控制服务类
 *
 * 支持通过设备名称控制智能开关设备，包括插座、风扇、热水器等
 *
 * @example
 * ```typescript
 * // 设置依赖
 * SwitchService.setHassService(hassService);
 *
 * // 注册到 MCP 服务器
 * mcp.register(SwitchService);
 * ```
 */
export class SwitchService {
  private static hassServiceInstance: IHassService | null = null;

  /**
   * 设置 Home Assistant 服务实例
   * 必须在注册服务前调用
   *
   * @param hassService Home Assistant 服务实例
   */
  public static setHassService(hassService: IHassService) {
    SwitchService.hassServiceInstance = hassService;
  }

  /**
   * 通过名称控制开关设备
   *
   * 支持的操作：
   * - turn_on: 开启设备
   * - turn_off: 关闭设备
   * - toggle: 切换状态 (反转当前状态)
   *
   * @param name 开关设备名称 (如: 客厅插座、卧室风扇)
   * @param action 控制动作
   * @returns 控制结果，包含成功状态、设备信息和功率信息
   */
  @Tool(
    "控制智能开关设备 - 支持插座、开关、风扇等设备的开关控制。" +
      "适用于: 智能插座、墙壁开关、风扇、热水器等单一开关设备。" +
      "注意: 不适用于灯光设备 (请使用 LightControl)，不支持亮度调节。"
  )
  public async SwitchControl(
    @Param(z.string().describe("开关设备名称，如: 客厅插座、卧室风扇、厨房插座1"))
    name: string,
    @Param(
      z
        .enum(["turn_on", "turn_off", "toggle"])
        .describe(
          "控制动作说明:\n" +
            "- turn_on: 开启设备 (适用于: '打开客厅插座')\n" +
            "- turn_off: 关闭设备 (适用于: '关闭卧室风扇')\n" +
            "- toggle: 切换状态 (适用于: '切换一下插座的状态')\n" +
            "注意: toggle 会自动反转当前状态，在不知道当前状态时很有用"
        )
    )
    action: SwitchActionType
  ): Promise<SwitchControlResult | MultipleDeviceResponse | ErrorResponse> {
    const startTime = Date.now();
    const hassService = this.getHassService();

    // 查找匹配的设备
    const entities = await this.findSwitchByName(name);

    // 没有找到设备
    if (entities.length === 0) {
      return {
        success: false,
        errors: [`未找到名称包含 '${name}' 的开关设备`],
      };
    }

    // 找到多个设备，返回选项让用户选择
    if (entities.length > 1) {
      return {
        success: false,
        msg: "找到多个设备，请问需要控制哪一个？",
        entities: entities.map((entity) => ({
          entity_id: entity.entity_id,
          friendly_name: entity.attributes.friendly_name || entity.entity_id,
        })),
      };
    }

    const selectedEntity = entities[0]!;
    const entityId = selectedEntity.entity_id;
    const friendlyName = selectedEntity.attributes.friendly_name || entityId;

    // 处理 toggle 操作
    let finalAction = action;
    if (action === "toggle") {
      // toggle 操作：根据当前状态反转
      finalAction = selectedEntity.state === "on" ? "turn_off" : "turn_on";
    }

    try {
      // 调用 Home Assistant 服务
      await hassService.callServices({
        domain: "switch",
        service: finalAction,
        service_data: {
          entity_id: entityId,
        },
      });

      // 确定新状态
      const newState: "on" | "off" = finalAction === "turn_on" ? "on" : "off";

      // 提取功率信息
      const powerInfo = this.extractPowerInfo(selectedEntity);

      // 生成友好的中文消息
      const message = this.generateMessage(finalAction, friendlyName, powerInfo);

      // 返回成功结果 - 使用类型断言确保类型兼容
      const successResult: SwitchControlResult = {
        success: true,
        entity_id: entityId,
        friendly_name: friendlyName,
        action: finalAction,
        state: newState,
        ...(powerInfo !== undefined ? { power_info: powerInfo } : {}),
        message,
        execution_time: Date.now() - startTime,
      };

      return successResult;
    } catch (error) {
      return {
        success: false,
        entity_id: entityId,
        friendly_name: friendlyName,
        errors: [`控制失败: ${error instanceof Error ? error.message : "未知错误"}`],
      };
    }
  }

  /**
   * 获取 Home Assistant 服务实例
   * @throws 如果服务未初始化
   */
  private getHassService(): IHassService {
    if (!SwitchService.hassServiceInstance) {
      throw new Error("SwitchService 未初始化，请先调用 setHassService()");
    }
    return SwitchService.hassServiceInstance;
  }

  /**
   * 通过名称查找开关设备
   *
   * @param name 设备名称
   * @returns 匹配的设备列表
   */
  private async findSwitchByName(name: string): Promise<HassState[]> {
    const hassService = this.getHassService();
    const allStates = await hassService.getStates();

    // 过滤出 switch 域的设备，并且 friendly_name 包含指定名称
    return allStates.filter(
      (state: HassState) => state.entity_id.startsWith("switch.") && state.attributes.friendly_name?.includes(name)
    );
  }

  /**
   * 从设备状态中提取功率信息
   *
   * @param entity 设备状态
   * @returns 功率信息对象 (如果设备支持)
   */
  private extractPowerInfo(entity: HassState): SwitchPowerInfo | undefined {
    const attributes = entity.attributes;
    const extraStateAttributes = attributes.extra_state_attributes as Record<string, unknown> | undefined;

    if (!extraStateAttributes) {
      return undefined;
    }

    const powerInfo: SwitchPowerInfo = {};

    // 提取当前功率
    if (typeof extraStateAttributes.current_power_w === "number") {
      powerInfo.current_power_w = extraStateAttributes.current_power_w;
    }

    // 提取今日耗电量
    if (typeof extraStateAttributes.today_energy_kwh === "number") {
      powerInfo.today_energy_kwh = extraStateAttributes.today_energy_kwh;
    }

    // 提取本月耗电量
    if (typeof extraStateAttributes.monthly_energy_kwh === "number") {
      powerInfo.monthly_energy_kwh = extraStateAttributes.monthly_energy_kwh;
    }

    // 如果没有任何功率信息，返回 undefined
    return Object.keys(powerInfo).length > 0 ? powerInfo : undefined;
  }

  /**
   * 生成友好的中文消息
   *
   * @param action 执行的操作
   * @param friendlyName 设备友好名称
   * @param powerInfo 功率信息
   * @returns 友好的中文消息
   */
  private generateMessage(action: SwitchActionType, friendlyName: string, powerInfo?: SwitchPowerInfo): string {
    const actionText = action === "turn_on" ? "已开启" : "已关闭";

    let message = `${actionText}${friendlyName}`;

    // 如果有功率信息，添加功率信息
    if (powerInfo?.current_power_w !== undefined) {
      message += `，当前功率 ${powerInfo.current_power_w}W`;
    }

    // 如果有今日耗电量，添加耗电量信息
    if (powerInfo?.today_energy_kwh !== undefined) {
      message += `，今日耗电 ${powerInfo.today_energy_kwh}kWh`;
    }

    return message;
  }
}
