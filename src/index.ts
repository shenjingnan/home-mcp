#!/usr/bin/env node

import { BestMCP, Param, Tool } from "bestmcp";
import z from "zod";
import { LightControlService } from "@/services";
import type { HassConfig, HassHistory, HassLogbook, HassMinimalHistory, HassState } from "@/types";
import { buildPath, getPackageVersion, separatePathParams } from "@/utils";

// Mock服务器支持 - 仅在开发环境启用
async function initializeMocks() {
  if (process.env.USE_MOCK === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Mock mode should not be used in production environment");
    }

    console.log("🔧 Initializing Mock Server for Home Assistant API...");

    try {
      const { setupMocks } = await import("@/mocks/server");
      setupMocks();
    } catch (error) {
      console.error("❌ Failed to initialize mock server:", error);
      process.exit(1);
    }
  }
}

class HassService {
  hassToken = (process.env.HA_TOKEN ?? "").trim();
  hassUrl = (process.env.HA_BASE_URL ?? "").trim();

  private async makeHassRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: unknown
  ): Promise<T> {
    // 在Mock模式下使用固定的mock URL
    const baseUrl =
      process.env.USE_MOCK === "true"
        ? "http://mock-homeassistant.local" // MSW会拦截这个域名的请求
        : this.hassUrl;

    // Mock模式下不需要验证真实的Home Assistant凭据
    if (process.env.USE_MOCK !== "true" && (!this.hassToken || !this.hassUrl)) {
      throw new Error("未配置 Home Assistant 凭据，请设置 HA_TOKEN 和 HA_BASE_URL 环境变量");
    }

    try {
      // Mock模式下的请求头
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // 只在非Mock模式下添加认证头
      if (process.env.USE_MOCK !== "true") {
        headers.Authorization = `Bearer ${this.hassToken}`;
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Home Assistant API 请求失败: ${error.message}`);
      }
      throw new Error("Home Assistant API 请求时发生未知错误");
    }
  }

  // @Tool("检查 Home Assistant API 服务")
  checkHassAPIService() {
    /**
     * 检查 Home Assistant API 服务
     * @returns 如果 API 正常运行，则返回一条消息。
     */
    return this.makeHassRequest<{ message: string }>("/api/");
  }

  // @Tool("获取 Home Assistant 配置")
  getConfig() {
    /**
     * 获取 Home Assistant 配置
     * @returns json
     */
    return this.makeHassRequest<HassConfig>("/api/config");
  }

  // @Tool("获取当前加载组件的列表")
  getComponents() {
    /**
     * 获取当前加载组件的列表
     * @returns json
     */
    return this.makeHassRequest<string[]>("/api/components");
  }

  // @Tool("获取当前加载的事件列表")
  getEvents() {
    /**
     * 返回一个事件对象数组。每个事件对象包含事件名称和监听器数量。
     * @returns json
     */
    return this.makeHassRequest<Array<{ event: string; listener_count: number }>>("/api/events");
  }

  // @Tool("获取当前加载的服务列表")
  getServices() {
    /**
     * 返回一个服务对象数组。每个对象包含域和包含的服务。
     * @returns json
     */
    return this.makeHassRequest<Array<{ domain: string; services: string[] }>>("/api/services");
  }

  // @Tool("获取过去一段时间内状态变化的数组")
  async getHistory(
    @Param(
      z.object({
        filter_entity_id: z.string().describe("筛选一个或多个实体，多个实体用逗号分隔"),
        end_time: z.string().optional().describe("用于指定查询结束时间（URL 编码格式，默认为1天）"),
        minimal_response: z
          .boolean()
          .optional()
          .describe("仅返回 first/last 状态外的 last_changed 和 state（速度更快）"),
        no_attributes: z.boolean().optional().describe("跳过从数据库返回 attributes 字段（速度更快）"),
        significant_changes_only: z.boolean().optional().describe("仅返回重要的状态变化"),
      }),
      "查询参数"
    )
    payload: {
      filter_entity_id: string;
      end_time?: string;
      minimal_response?: boolean;
      no_attributes?: boolean;
      significant_changes_only?: boolean;
    }
  ) {
    /**
     * 返回过去一段时间内状态变化的数组。每个对象包含实体的详细信息。
     * <timestamp>（格式为 YYYY-MM-DDThh:mm:ssTZD）是可选的，默认为请求时间前一天，表示查询的起始时间。
     * 以下参数是必需的：
     *   - filter_entity_id=<entity_ids>，用于筛选一个或多个实体，多个实体用逗号分隔。
     * 可以传递以下可选的 GET 参数：
     *   - end_time=<timestamp>，用于指定查询结束时间（URL 编码格式，默认为1天）。
     *   - minimal_response，仅返回 first/last 状态外的 last_changed 和 state（速度更快）。
     *   - no_attributes，跳过从数据库返回 attributes 字段（速度更快）。
     *   - significant_changes_only，仅返回重要的状态变化。
     * @example 不使用 minimal_response
     * [
     *   [
     *     {
     *       "attributes": {
     *         "friendly_name": "Weather Temperature",
     *         "unit_of_measurement": "\u00b0C"
     *       },
     *       "entity_id": "sensor.weather_temperature",
     *       "last_changed": "2016-02-06T22:15:00+00:00",
     *       "last_updated": "2016-02-06T22:15:00+00:00",
     *       "state": "-3.9"
     *     },
     *     {
     *       "attributes": {
     *         "friendly_name": "Weather Temperature",
     *         "unit_of_measurement": "\u00b0C"
     *       },
     *       "entity_id": "sensor.weather_temperature",
     *       "last_changed": "2016-02-06T22:15:00+00:00",
     *       "last_updated": "2016-02-06T22:15:00+00:00",
     *       "state": "-1.9"
     *     }
     *   ]
     * ]
     *
     * @example 使用 minimal_response
     * [
     *   [
     *     {
     *       "attributes": {
     *         "friendly_name": "Weather Temperature",
     *         "unit_of_measurement": "\u00b0C"
     *       },
     *       "entity_id": "sensor.weather_temperature",
     *       "last_changed": "2016-02-06T22:15:00+00:00",
     *       "last_updated": "2016-02-06T22:15:00+00:00",
     *       "state": "-3.9"
     *     },
     *     {
     *       "last_changed": "2016-02-06T22:20:00+00:00",
     *       "state": "-2.9"
     *     },
     *     {
     *       "last_changed": "2016-02-06T22:22:00+00:00",
     *       "state": "-2.2"
     *     },
     *     {
     *       "attributes": {
     *         "friendly_name": "Weather Temperature",
     *         "unit_of_measurement": "\u00b0C"
     *       },
     *       "entity_id": "sensor.weather_temperature",
     *       "last_changed": "2016-02-06T22:25:00+00:00",
     *       "last_updated": "2016-02-06T22:25:00+00:00",
     *       "state": "-1.9"
     *     }
     *   ]
     * ]
     */
    const { filter_entity_id, ...queryParams } = payload;
    return this.makeHassRequest<Array<HassHistory | HassMinimalHistory>>(
      `/api/history/period/${filter_entity_id}`,
      "GET",
      queryParams
    );
  }

  // @Tool("获取日志条目")
  async getLogbook(
    @Param(
      z.object({
        start_time: z.string().optional().describe("格式为 YYYY-MM-DDThh:mm:ssTZD 的开始的时间段的起始时间"),
        entity: z.string().optional().describe("用于筛选某个实体"),
        end_time: z.string().optional().describe("格式为 YYYY-MM-DDThh:mm:ssTZD 的开始的时间段的结束时间"),
      }),
      "查询参数"
    )
    payload?: { start_time?: string; entity?: string; end_time?: string }
  ) {
    /**
     * 返回一个日志条目的数组。
     * <timestamp>（YYYY-MM-DDThh:mm:ssTZD）是可选的，默认为请求时间前一天。它决定了时间段的起始时间。
     * 你可以传递以下可选的 GET 参数：
     *   - entity=<entity_id> 用于筛选某个实体。
     *   - end_time=<timestamp> 用于选择从指定 <timestamp>（URL 编码格式）开始的时间段的结束时间。
     * @example
     * [
     *   {
     *     "context_user_id": null,
     *     "domain": "alarm_control_panel",
     *     "entity_id": "alarm_control_panel.area_001",
     *     "message": "changed to disarmed",
     *     "name": "Security",
     *     "when": "2020-06-20T16:44:26.127295+00:00"
     *   },
     *   {
     *     "context_user_id": null,
     *     "domain": "homekit",
     *     "entity_id": "alarm_control_panel.area_001",
     *     "message": "send command alarm_arm_night for Security",
     *     "name": "HomeKit",
     *     "when": "2020-06-21T02:59:05.759645+00:00"
     *   },
     *   {
     *     "context_user_id": null,
     *     "domain": "alarm_control_panel",
     *     "entity_id": "alarm_control_panel.area_001",
     *     "message": "changed to armed_night",
     *     "name": "Security",
     *     "when": "2020-06-21T02:59:06.015463+00:00"
     *   }
     * ]
     */

    const { pathParams, queryParams } = separatePathParams(payload, ["start_time"]);

    const path = buildPath("/api/logbook/:start_time", pathParams as Record<string, string>);

    return this.makeHassRequest<HassLogbook[]>(path, "GET", queryParams);
  }

  @Tool("获取 Home Assistant 中所有实体的状态信息")
  async getStates(
    @Param(
      z.object({
        entity_id: z.string().optional().describe("用于筛选某个实体"),
      }),
      "查询参数"
    )
    payload?: { entity_id?: string }
  ) {
    /**
     * 获取 Home Assistant 中所有实体的状态信息
     * 你可以传递以下可选的 GET 参数：
     *   - entity_id=<entity_id> 用于筛选某个实体。
     * @returns 返回一个状态对象数组。每个状态对象包含以下属性：entity_id、state、last_changed 和 attributes。
     */
    if (payload?.entity_id) {
      return this.makeHassRequest<HassState[]>(`/api/states/${payload.entity_id}`, "GET");
    }
    return this.makeHassRequest<HassState[]>("/api/states", "GET");
  }

  // @Tool("获取当前 Home Assistant 会话期间记录的所有错误日志")
  async getErrorLog() {
    /**
     * 获取当前 Home Assistant 会话期间记录的所有错误日志，并以纯文本形式返回。
     * @example
     * 15-12-20 11:02:50 homeassistant.components.recorder: Found unfinished sessions
     * 15-12-20 11:03:03 netdisco.ssdp: Error fetching description at http://192.168.1.1:8200/rootDesc.xml
     * 15-12-20 11:04:36 homeassistant.components.alexa: Received unknown intent HelpIntent
     */
    return this.makeHassRequest<string>("/api/error_log", "GET");
  }

  // @Tool("返回指定 camera entity_id 的数据（图像）")
  async getCameraProxy(
    @Param(
      z.object({
        camera_entity_id: z.string().describe("用于指定 camera entity_id"),
      }),
      "查询参数"
    )
    payload: { camera_entity_id: string }
  ) {
    /**
     * 返回指定 camera entity_id 的数据（图像）。
     */
    return this.makeHassRequest<string>(`/api/camera_proxy/${payload.camera_entity_id}`, "GET");
  }

  // @Tool("返回 calendar entity 的列表")
  async getCalendars(payload: { calendar_entity_id?: string; end_time?: string; start_time?: string }) {
    /**
     * 返回 calendar entity 的列表。
     * 可以传递以下可选的 GET 参数：
     *   - calendar_entity_id=<entity_id>，用于指定查询 calendar_entity_id。
     *   - end_time=<timestamp>，用于指定查询结束时间（URL 编码格式，默认为1天）。
     *   - start_time=<timestamp>，用于指定查询起始时间（URL 编码格式，默认为1天）。
     * @example
     *[
     *  {
     *    "entity_id": "calendar.holidays",
     *    "name": "National Holidays"
     *   },
     *   {
     *    "entity_id": "calendar.personal",
     *    "name": "Personal Calendar"
     *   }
     * ]
     */
    const { pathParams, queryParams } = separatePathParams(payload, ["calendar_entity_id"]);

    const path = buildPath("/api/calendars/:calendar_entity_id", pathParams as Record<string, string>);
    return this.makeHassRequest<{ entity_id: string; name: string }[]>(path, "GET", queryParams);
  }

  // @Tool("更新或创建一个状态")
  async updateState(
    @Param(
      z.object({
        state: z.string().describe("用于指定状态"),
        attributes: z.record(z.string(), z.unknown()).optional().describe("用于指定属性"),
      }),
      "查询参数"
    )
    payload: { state: string; attributes?: Record<string, unknown> }
  ) {
    /**
     * 更新或创建一个状态。你可以创建任何你想要的状态，它不需要在 Home Assistant 中有对应的实体。
     * 注意：此端点仅设置 Home Assistant 内部的设备表示，并不会与实际设备通信。如需与设备通信，请使用 POST /api/services/<domain>/<service> 端点。
     * 需要传入至少包含 state 属性的 JSON 对象：
     * {
     *   "state": "below_horizon",
     *   "attributes": {
     *    "next_rising": "2016-05-31T03:39:14+00:00",
     *    "next_setting": "2016-05-31T19:16:42+00:00"
     *   }
     * }
     * 如果实体已存在，则返回码为 200；如果设置了新实体的状态，则返回码为 201。响应头中会包含新资源的 URL（location header）。响应体将包含一个 JSON 编码的 State 对象。
     * {
     *   "attributes": {
     *     "next_rising": "2016-05-31T03:39:14+00:00",
     *     "next_setting": "2016-05-31T19:16:42+00:00"
     *   },
     *   "entity_id": "sun.sun",
     *   "last_changed": "2016-05-30T21:43:29.204838+00:00",
     *   "last_updated": "2016-05-30T21:47:30.533530+00:00",
     *   "state": "below_horizon"
     * }
     */
    return this.makeHassRequest<HassState>("/api/states", "POST", payload);
  }

  // @Tool("触发一个指定事件类型的事件")
  async fireEvents(
    @Param(
      z.object({
        event_type: z.string().describe("用于指定事件类型"),
        event_data: z.record(z.string(), z.unknown()).optional().describe("用于指定事件数据"),
      }),
      "查询参数"
    )
    payload: { event_type: string; event_data?: Record<string, unknown> }
  ) {
    /**
     * 触发一个指定 `event_type` 的事件。请注意事件数据结构，详见我们的 [数据表传送门](https://data.home-assistant.io/docs/events/#database-table)。
     * 你可以传递一个可选的 JSON 对象作为 `event_data`。
     * {
     *   "next_rising": "2016-05-31T03:39:14+00:00"
     * }
     * 如果成功，将返回一条消息。
     * {
     *   "message": "Event download_file fired."
     * }
     */
    return this.makeHassRequest<{ message: string }>(`/api/events/${payload.event_type}`, "POST", payload.event_data);
  }

  // @Tool("在指定域内调用一个服务")
  async callServices(
    @Param(
      z.object({
        domain: z.string().describe("用于指定域"),
        service: z.string().describe("用于指定服务"),
        service_data: z.record(z.string(), z.unknown()).optional().describe("用于指定服务数据"),
      }),
      "查询参数"
    )
    payload: { domain: string; service: string; service_data?: Record<string, unknown> }
  ) {
    /**
     * 在指定域内调用一个服务。该方法会在服务执行完成后返回。
     * 你可以传递一个可选的 JSON 对象作为 service_data 使用。
     * {
     *   "entity_id": "light.Ceiling"
     * }
     * 返回在服务执行期间发生变化的状态列表，如果服务支持，还可以返回响应数据。
     * [
     *   {
     *     "attributes": {},
     *     "entity_id": "sun.sun",
     *     "last_changed": "2016-05-30T21:43:32.418320+00:00",
     *     "state": "below_horizon"
     *   },
     *   {
     *     "attributes": {},
     *     "entity_id": "process.Dropbox",
     *     "last_changed": "22016-05-30T21:43:32.418320+00:00",
     *     "state": "on"
     *   }
     * ]
     * 提示：结果将包含在服务执行期间发生变化的所有状态，即使这些变化是由系统中其他事件引起的。
     * 如果你调用的服务支持返回响应数据，可以在 URL 后添加 ?return_response 来获取。此时响应将同时包含变更的实体列表和服务的响应数据。
     * {
     *   "changed_states": [
     *     {
     *       "attributes": {},
     *       "entity_id": "sun.sun",
     *       "last_changed": "2024-04-22T20:45:54.418320-04:00",
     *       "state": "below_horizon"
     *     },
     *     {
     *       "attributes": {},
     *       "entity_id": "binary_sensor.dropbox",
     *       "last_changed": "2024-04-22T20:45:54.418320-04:00",
     *       "state": "on"
     *     }
     *   ],
     *   "service_response": {
     *     "weather.new_york_forecast": {
     *       "forecast": [
     *         {
     *           "condition": "clear-night",
     *           "datetime": "2024-04-22T20:45:55.173725-04:00",
     *           "precipitation_probability": 0,
     *           "temperature": null,
     *           "templow": 6.0
     *         },
     *         {
     *           "condition": "rainy",
     *           "datetime": "2024-04-23T20:45:55.173756-04:00",
     *           "precipitation_probability": 60,
     *           "temperature": 16.0,
     *           "templow": 4.0
     *         }
     *       ]
     *     }
     *   }
     * }
     * 注意：有些服务不会返回数据，有些服务可以选择性地返回响应数据，还有一些服务始终返回响应数据。
     * 如果你在调用必须返回数据的服务时没有使用 return_response，API 会返回 400 错误。同样地，如果你在调用不会返回任何数据的服务时使用了 return_response，也会收到 400 错误。
     */
    return this.makeHassRequest<{
      changed_states: HassState[];
      service_response: Record<string, unknown>;
    }>(`/api/services/${payload.domain}/${payload.service}`, "POST", payload.service_data);
  }

  // @Tool("触发对 configuration.yaml 的检查")
  async checkConfig() {
    /**
     * 触发对 configuration.yaml 的检查。此请求无需传递额外数据。需要启用 config 集成。
     * 如果检查成功，将返回如下内容：
     * ```json
     * {
     *  "errors": null,
     *  "result": "valid"
     * }
     * ```
     * 如果检查失败，对象中的 errors 属性会列出导致检查失败的原因。例如：
     * ```json
     * {
     *   "errors": "Integration not found: frontend:",
     *   "result": "invalid"
     * }
     * ```
     */
    return this.makeHassRequest<{
      errors: string | null;
      result: "valid" | "invalid";
    }>("/api/config/core/check_config", "POST");
  }

  // @Tool("删除具有指定 entity_id 的实体")
  async deleteStates(
    @Param(
      z.object({
        entity_id: z.string().describe("用于指定实体ID"),
      }),
      "查询参数"
    )
    payload: { entity_id: string }
  ) {
    /**
     * 删除具有指定 entity_id 的实体。
     */
    return this.makeHassRequest<void>(`/api/states/${payload.entity_id}`, "DELETE");
  }
}

// 创建 MCP 服务器实例
const mcp = new BestMCP({
  name: "智能家居 MCP 服务",
  version: getPackageVersion(),
});

// 创建 HassService 实例用于灯光控制服务
const hassService = new HassService();

// 设置灯光控制服务的依赖
LightControlService.setHassService(hassService);

// 注册服务类
mcp.register(HassService);
mcp.register(LightControlService);

// 启动服务器
async function startServer() {
  await initializeMocks();

  mcp.run().catch((error: Error) => {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  });
}

startServer();
