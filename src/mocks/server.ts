import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// 创建MSW服务器实例
export const server = setupServer(...handlers);

/**
 * 设置Mock服务器，用于开发和测试环境
 * 只在非生产环境下启用
 */
export function setupMocks(): void {
  // 生产环境安全检查
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mocks should not be used in production environment");
  }

  // 启动Mock服务器
  server.listen({
    onUnhandledRequest: "warn",
  });

  console.log("🔧 Mock server started for Home Assistant API");
  console.log("📍 Mocked endpoints:");
  console.log("   - GET /api/");
  console.log("   - GET /api/states");
  console.log("   - POST /api/services/<domain>/<service>");
  console.log("   - GET /api/history");
  console.log("   - GET /api/logbook");
  console.log("   - GET /api/events");
  console.log("   - GET /api/camera_proxy/<entity_id>");
  console.log("   - GET /api/config");
  console.log("   - GET /api/components");
  console.log("   - GET /api/services");
  console.log("   - POST /api/states/<entity_id>");
  console.log("   - DELETE /api/states/<entity_id>");

  // 优雅关闭处理
  process.once("SIGTERM", () => server.close());
  process.once("SIGINT", () => server.close());
}

/**
 * 关闭Mock服务器
 */
export function shutdownMocks(): void {
  server.close();
  console.log("🔧 Mock server stopped");
}

/**
 * 重置Mock处理器到默认状态
 */
export function resetMocks(): void {
  server.resetHandlers();
  console.log("🔧 Mock handlers reset to default");
}
