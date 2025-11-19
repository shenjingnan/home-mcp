import { HttpResponse, http } from "msw";
import { mockComponents } from "./data/components";
import { mockConfig } from "./data/config";
import { mockEvents } from "./data/events";
import { mockHistory } from "./data/history";
import { mockLogbook } from "./data/logbook";
import { mockServices } from "./data/services";
import { mockStates } from "./data/states";
import { buildResponse } from "./utils/response-builder";

// API请求体类型定义
interface StateUpdateRequest {
  state?: string;
  attributes?: Record<string, unknown>;
}

interface ServiceCallRequest {
  entity_id?: string;
  brightness_pct?: number;
  rgb_color?: number[];
  [key: string]: unknown;
}

interface EventTriggerRequest {
  [key: string]: unknown;
}

// 动态属性设置的类型安全方法
function setEntityAttributes(entity: { attributes: Record<string, unknown> }, updates: Record<string, unknown>): void {
  Object.assign(entity.attributes, updates);
}

/**
 * Home Assistant API Mock处理器
 * 覆盖项目中的所有HomeAssistant API端点
 */
export const handlers = [
  // 系统信息 API
  http.get("*/api/", () => {
    return HttpResponse.json(
      buildResponse({
        message: "API running.",
        version: "2024.1.0",
        ha_version: "2024.1.0",
        config_dir: "/config",
        elevation: 0,
        location_name: "Home",
        latitude: 32.87336,
        longitude: -117.22743,
        temperature_unit: "°C",
        time_zone: "America/Los_Angeles",
        unit_system: {
          length: "km",
          mass: "g",
          pressure: "Pa",
          volume: "L",
          accumulated_precipitation: "mm",
        },
      })
    );
  }),

  // 系统配置 API
  http.get("*/api/config", () => {
    return HttpResponse.json(buildResponse(mockConfig));
  }),

  // 组件列表 API
  http.get("*/api/components", () => {
    return HttpResponse.json(buildResponse(mockComponents));
  }),

  // 服务列表 API
  http.get("*/api/services", () => {
    return HttpResponse.json(buildResponse(mockServices));
  }),

  // 实体状态列表 API
  http.get("*/api/states", () => {
    return HttpResponse.json(buildResponse(mockStates));
  }),

  // 获取单个实体状态 API
  http.get("*/api/states/:entityId", ({ params }) => {
    const { entityId } = params;
    const entity = mockStates.find((state) => state.entity_id === entityId);

    if (!entity) {
      return HttpResponse.json(buildResponse(null, `Entity ${entityId} not found`), { status: 404 });
    }

    return HttpResponse.json(buildResponse(entity));
  }),

  // 更新实体状态 API
  http.post("*/api/states/:entityId", async ({ params, request }) => {
    const { entityId } = params;
    const body = (await request.json()) as StateUpdateRequest;

    const entity = mockStates.find((state) => state.entity_id === entityId);

    if (!entity) {
      return HttpResponse.json(buildResponse(null, `Entity ${entityId} not found`), { status: 404 });
    }

    // 更新实体状态
    Object.assign(entity, {
      state: body.state || entity.state,
      attributes: { ...entity.attributes, ...body.attributes },
      last_updated: new Date().toISOString(),
      last_changed: new Date().toISOString(),
    });

    return HttpResponse.json(buildResponse(entity));
  }),

  // 删除实体状态 API
  http.delete("*/api/states/:entityId", ({ params }) => {
    const { entityId } = params;
    const index = mockStates.findIndex((state) => state.entity_id === entityId);

    if (index === -1) {
      return HttpResponse.json(buildResponse(null, `Entity ${entityId} not found`), { status: 404 });
    }

    mockStates.splice(index, 1);
    return HttpResponse.json(buildResponse({ message: "Entity deleted successfully" }));
  }),

  // 服务调用 API
  http.post("*/api/services/:domain/:service", async ({ params, request }) => {
    const { domain, service } = params;
    const body = (await request.json()) as ServiceCallRequest;

    // 模拟服务调用处理
    if (domain === "light" && service === "turn_on") {
      const entityId = body.entity_id;
      const entity = mockStates.find((state) => state.entity_id === entityId);

      if (entity && "supported_features" in entity.attributes && entity.attributes.supported_features) {
        entity.state = "on";
        setEntityAttributes(entity, {
          brightness: Math.floor((body.brightness_pct || 100) * 2.55),
          rgb_color: body.rgb_color || [255, 255, 255],
        });
        entity.last_updated = new Date().toISOString();
        entity.last_changed = new Date().toISOString();
      }
    } else if (domain === "light" && service === "turn_off") {
      const entityId = body.entity_id;
      const entity = mockStates.find((state) => state.entity_id === entityId);

      if (entity) {
        entity.state = "off";
        entity.last_updated = new Date().toISOString();
        entity.last_changed = new Date().toISOString();
      }
    }

    return HttpResponse.json(
      buildResponse({
        context: {
          id: `SERVICE_${Date.now()}`,
          parent_id: null,
          user_id: null,
        },
        service_call_id: `SERVICE_CALL_${Date.now()}`,
      })
    );
  }),

  // 历史数据 API
  http.get("*/api/history/period", ({ request }) => {
    const url = new URL(request.url);
    const entityId = url.searchParams.get("filter_entity_id");

    // 根据实体ID过滤历史数据
    let filteredHistory = mockHistory;
    if (entityId) {
      filteredHistory = mockHistory.filter((item) => {
        const historyItem = item[0] as { entity_id: string };
        return historyItem.entity_id === entityId;
      });
    }

    return HttpResponse.json(buildResponse(filteredHistory));
  }),

  // 日志查询 API
  http.get("*/api/logbook", ({ request }) => {
    const url = new URL(request.url);
    const entityId = url.searchParams.get("entity");

    // 根据实体ID过滤日志
    let filteredLogbook = mockLogbook;
    if (entityId) {
      filteredLogbook = mockLogbook.filter((item) => item.entity_id === entityId);
    }

    return HttpResponse.json(buildResponse(filteredLogbook));
  }),

  // 事件监听 API
  http.get("*/api/events", () => {
    return HttpResponse.json(buildResponse(mockEvents));
  }),

  // 触发事件 API
  http.post("*/api/events/:eventType", async ({ params, request }) => {
    const { eventType } = params;
    const body = (await request.json()) as EventTriggerRequest;

    return HttpResponse.json(
      buildResponse({
        context: {
          id: `EVENT_${Date.now()}`,
          parent_id: null,
          user_id: null,
        },
        event_type: eventType,
        time_fired: new Date().toISOString(),
        data: body,
      })
    );
  }),

  // 摄像头图像 API
  http.get("*/api/camera_proxy/:entityId", ({ params }) => {
    const { entityId } = params;

    // 检查实体是否存在
    const entity = mockStates.find((state) => state.entity_id === entityId);
    if (!entity || !entity.entity_id.startsWith("camera.")) {
      return HttpResponse.json(buildResponse(null, `Camera ${entityId} not found`), { status: 404 });
    }

    // 返回模拟的图像数据 (base64编码的小图像)
    const mockImageBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==";

    return HttpResponse.arrayBuffer(Uint8Array.from(atob(mockImageBase64), (c) => c.charCodeAt(0)).buffer, {
      headers: {
        "Content-Type": "image/png",
      },
    });
  }),

  // 错误日志 API
  http.get("*/api/error_log", () => {
    return HttpResponse.json(
      buildResponse({
        errors: [],
        warnings: [],
        info: [],
      })
    );
  }),

  // 配置检查 API
  http.post("*/api/config/core/check_config", () => {
    return HttpResponse.json(
      buildResponse({
        valid: true,
        errors: [],
        warnings: [],
      })
    );
  }),

  // 日历事件 API
  http.get("*/api/calendars", () => {
    return HttpResponse.json(
      buildResponse([
        {
          entity_id: "calendar.personal",
          name: "Personal",
          friendly_name: "Personal Calendar",
        },
        {
          entity_id: "calendar.holidays",
          name: "Holidays",
          friendly_name: "Holidays Calendar",
        },
      ])
    );
  }),

  // 获取日历事件 API
  http.get("*/api/calendars/:entityId", ({ request }) => {
    const url = new URL(request.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    return HttpResponse.json(
      buildResponse([
        {
          summary: "Mock Event",
          start: start || new Date().toISOString(),
          end: end || new Date(Date.now() + 3600000).toISOString(),
          location: "Mock Location",
          description: "This is a mock calendar event",
        },
      ])
    );
  }),
];

// 导出处理器数组，用于服务器配置
export default handlers;
