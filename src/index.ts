#!/usr/bin/env node

import { BestMCP, Tool } from "bestmcp";

interface HassState {
  attributes: Record<string, unknown>;
  entity_id: string;
  last_changed: string;
  state: string;
}

class HassService {
  hassToken = (process.env["HASS_TOKEN"] ?? "").trim();
  hassUrl = (process.env["HASS_URL"] ?? "").trim();

  private async makeHassRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: unknown,
  ): Promise<T> {
    if (!this.hassToken || !this.hassUrl) {
      throw new Error("未配置 Home Assistant 凭据，请设置 HASS_TOKEN 和 HASS_URL 环境变量");
    }

    try {
      const response = await fetch(`${this.hassUrl}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.hassToken}`,
          "Content-Type": "application/json",
        },
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

  @Tool("检查 Home Assistant API 服务")
  checkHassAPIService() {
    /**
     * 检查 Home Assistant API 服务
     * @returns 如果 API 正常运行，则返回一条消息。
     */
    return this.makeHassRequest<{ message: string }>("/api/");
  }

  @Tool("获取 Home Assistant 中所有实体的状态信息")
  async getStates() {
    /**
     * 获取 Home Assistant 中所有实体的状态信息
     * @returns 返回一个状态对象数组。每个状态对象包含以下属性：entity_id、state、last_changed 和 attributes。
     */
    return this.makeHassRequest<HassState[]>("/api/states");
  }
}

// 创建 MCP 服务器实例
const mcp = new BestMCP("智能家居 MCP 服务", "0.0.3");

// 注册服务类
mcp.register(HassService);

// 启动服务器
mcp.run().catch((error: Error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
