import { z } from "zod";
import { BestMCP, Param, Tool } from "../src/index.js";

// 配置接口
interface AppConfig {
  name: string;
  version: string;
  transport: "stdio" | "http";
  port?: number;
  host?: string;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  corsOrigins?: string[];
}

// 环境变量配置解析
function parseConfig(): AppConfig {
  const env = process.env;

  // 基础配置
  const config: AppConfig = {
    name: env.SERVICE_NAME || "mcp-service",
    version: env.SERVICE_VERSION || "1.0.0",
    transport: (env.TRANSPORT_TYPE as "stdio" | "http") || "stdio",
  };

  // HTTP 配置
  if (config.transport === "http") {
    config.port = parseInt(env.PORT || "8000", 10);
    config.host = env.HOST || "127.0.0.1";
  }

  // 功能开关
  config.enableLogging = env.ENABLE_LOGGING === "true";
  config.enableMetrics = env.ENABLE_METRICS === "true";

  // CORS 配置
  if (env.CORS_ORIGINS) {
    config.corsOrigins = env.CORS_ORIGINS.split(",").map((origin) => origin.trim());
  }

  return config;
}

// 验证配置
function validateConfig(config: AppConfig): void {
  if (!config.name) {
    throw new Error("服务名称不能为空");
  }

  if (config.transport === "http") {
    if (!config.port || config.port < 1 || config.port > 65535) {
      throw new Error("端口号必须在 1-65535 范围内");
    }

    if (!config.host) {
      throw new Error("HTTP 模式需要指定主机地址");
    }
  }
}

// 日志服务
class LoggingService {
  private enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  log(level: "info" | "warn" | "error", message: string, data?: any): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data }),
    };

    console.log(JSON.stringify(logEntry));
  }

  info(message: string, data?: any): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: any): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: any): void {
    this.log("error", message, data);
  }
}

// 指标收集服务
class MetricsService {
  private enabled: boolean;
  private metrics: Map<string, number> = new Map();

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  increment(name: string, value: number = 1): void {
    if (!this.enabled) return;

    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + value);
  }

  get(name: string): number {
    return this.metrics.get(name) || 0;
  }

  getAll(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  reset(): void {
    this.metrics.clear();
  }
}

// 示例服务
class ConfigurableService {
  private logger: LoggingService;
  private metrics: MetricsService;

  constructor(logger: LoggingService, metrics: MetricsService) {
    this.logger = logger;
    this.metrics = metrics;
  }

  @Tool("获取配置信息")
  async getConfig(): Promise<AppConfig> {
    this.metrics.increment("getConfig.calls");
    this.logger.info("获取配置信息");

    return parseConfig();
  }

  @Tool("回显消息")
  async echo(
    @Param(z.string(), "要回显的消息") message: string,
    @Param(z.boolean().optional(), "是否大写") uppercase: boolean = false,
  ): Promise<{ message: string; timestamp: string; uppercase: boolean }> {
    this.metrics.increment("echo.calls");
    this.logger.info("回显消息", { message, uppercase });

    const result = {
      message: uppercase ? message.toUpperCase() : message,
      timestamp: new Date().toISOString(),
      uppercase,
    };

    this.logger.info("回显结果", result);
    return result;
  }

  @Tool("延迟响应")
  async delay(
    @Param(z.number().min(0).max(10000), "延迟毫秒数") ms: number,
    @Param(z.string().optional(), "延迟期间的消息") message?: string,
  ): Promise<{ delay: number; message: string; startTime: string; endTime: string }> {
    this.metrics.increment("delay.calls");
    this.logger.info("开始延迟", { ms });

    const startTime = new Date().toISOString();

    if (message) {
      this.logger.info("延迟期间", { message });
    }

    await new Promise((resolve) => setTimeout(resolve, ms));

    const endTime = new Date().toISOString();
    this.metrics.increment("delay.total_ms", ms);

    const result = {
      delay: ms,
      message: message || `延迟了 ${ms} 毫秒`,
      startTime,
      endTime,
    };

    this.logger.info("延迟完成", result);
    return result;
  }

  @Tool("获取指标")
  async getMetrics(): Promise<{
    metrics: Record<string, number>;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    enabled: boolean;
  }> {
    this.logger.info("获取指标信息");

    return {
      metrics: this.metrics.getAll(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      enabled: this.metrics.enabled,
    };
  }

  @Tool("重置指标")
  async resetMetrics(): Promise<{ success: boolean; message: string }> {
    this.logger.warn("重置指标");
    this.metrics.reset();

    return {
      success: true,
      message: "指标已重置",
    };
  }

  @Tool("测试日志级别")
  async testLogging(): Promise<{
    levels: ("info" | "warn" | "error")[];
    messages: string[];
    enabled: boolean;
  }> {
    const messages = ["这是一条信息日志", "这是一条警告日志", "这是一条错误日志"];

    this.logger.info(messages[0]);
    this.logger.warn(messages[1]);
    this.logger.error(messages[2]);

    return {
      levels: ["info", "warn", "error"],
      messages,
      enabled: this.logger.enabled,
    };
  }
}

// 主函数
async function main() {
  try {
    // 解析和验证配置
    const config = parseConfig();
    validateConfig(config);

    console.log("📋 配置信息:");
    console.log(JSON.stringify(config, null, 2));

    // 创建服务实例
    const logger = new LoggingService(config.enableLogging);
    const metrics = new MetricsService(config.enableMetrics);

    // 创建 MCP 服务器
    const mcp = new BestMCP(config.name, config.version);
    mcp.register(new ConfigurableService(logger, metrics));

    // 启动服务器
    logger.info("启动服务器", { config });

    if (config.transport === "http") {
      await mcp.run({
        transport: "http",
        port: config.port!,
        host: config.host!,
      });

      console.log(`\n🌐 HTTP 服务器已启动: http://${config.host}:${config.port}/mcp`);
      console.log(`📊 日志记录: ${config.enableLogging ? "启用" : "禁用"}`);
      console.log(`📈 指标收集: ${config.enableMetrics ? "启用" : "禁用"}`);

      if (config.corsOrigins) {
        console.log(`🌍 CORS 允许来源: ${config.corsOrigins.join(", ")}`);
      }

      console.log("\n🧪 测试命令:");
      console.log(`# 获取配置`);
      console.log(`curl -X POST http://${config.host}:${config.port}/mcp \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(
        `  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "getConfig", "arguments": {}}}'`,
      );
    } else {
      await mcp.run({ transport: "stdio" });
      console.log("\n📡 Stdio 服务器已启动");
      console.log(`📊 日志记录: ${config.enableLogging ? "启用" : "禁用"}`);
      console.log(`📈 指标收集: ${config.enableMetrics ? "启用" : "禁用"}`);
    }

    // 优雅关闭
    process.on("SIGINT", async () => {
      logger.info("收到中断信号，正在关闭服务器");
      await mcp.stopServer();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ 启动失败:", error);
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp(): void {
  console.log("🚀 BestMCP 环境配置示例");
  console.log("");
  console.log("环境变量:");
  console.log("  SERVICE_NAME      - 服务名称 (默认: mcp-service)");
  console.log("  SERVICE_VERSION   - 服务版本 (默认: 1.0.0)");
  console.log("  TRANSPORT_TYPE    - 传输层类型 (stdio|http, 默认: stdio)");
  console.log("  PORT              - HTTP 端口号 (HTTP 模式, 默认: 8000)");
  console.log("  HOST              - HTTP 主机地址 (HTTP 模式, 默认: 127.0.0.1)");
  console.log("  ENABLE_LOGGING    - 启用日志记录 (true|false, 默认: false)");
  console.log("  ENABLE_METRICS    - 启用指标收集 (true|false, 默认: false)");
  console.log("  CORS_ORIGINS      - CORS 允许来源 (逗号分隔)");
  console.log("");
  console.log("示例:");
  console.log("  # HTTP 模式，启用日志和指标");
  console.log("  SERVICE_NAME=my-service TRANSPORT_TYPE=http PORT=3000 \\");
  console.log("    ENABLE_LOGGING=true ENABLE_METRICS=true npm start");
  console.log("");
  console.log("  # Stdio 模式，启用日志");
  console.log("  SERVICE_NAME=stdio-service ENABLE_LOGGING=true npm start");
}

// 处理命令行参数
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  showHelp();
  process.exit(0);
}

// 启动应用
if (require.main === module) {
  main();
}

export { type AppConfig, parseConfig, validateConfig, LoggingService, MetricsService, ConfigurableService };
