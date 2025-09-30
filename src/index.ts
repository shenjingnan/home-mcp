#!/usr/bin/env node

import { BestMCP, Param, Tool } from "bestmcp";
import { z } from "zod";

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
    body?: unknown
  ): Promise<T> {
    if (!this.hassToken || !this.hassUrl) {
      throw new Error(
        "未配置 Home Assistant 凭据，请设置 HASS_TOKEN 和 HASS_URL 环境变量"
      );
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

  @Tool("Add two numbers together")
  addNumbers(
    @Param(z.number(), "The first number to add") value1: number,
    @Param(
      z.number().optional(),
      "The second number to add (optional, defaults to 1)"
    )
    value2?: number
  ): number {
    /**
     * Add two numbers together
     * @param value1 The first number to add
     * @param value2 The second number to add (optional, defaults to 1)
     * @returns The sum of value1 and value2
     */
    return value1 + (value2 || 1);
  }

  @Tool("Subtract two numbers")
  subtract(
    @Param(z.number(), "The number to subtract from") a: number,
    @Param(z.number(), "The number to subtract") b: number
  ): number {
    /**
     * Subtract the second number from the first number
     * @param a The number to subtract from
     * @param b The number to subtract
     * @returns The difference between a and b
     */
    return a - b;
  }

  @Tool("Get the current time")
  getCurrentTime(): string {
    /**
     * Get the current time in ISO format
     * @returns Current time as ISO string
     */
    return new Date().toISOString();
  }

  @Tool("获取 Home Assistant 中所有实体的状态信息")
  async getStates() {
    return this.makeHassRequest<HassState[]>("/api/states");
  }
}

// 创建 MCP 服务器实例
const mcp = new BestMCP("Home Assistant MCP Server", "0.0.3");

// 注册服务类
mcp.register(HassService);

// 启动服务器
mcp.run().catch((error: Error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
