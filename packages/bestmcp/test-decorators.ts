#!/usr/bin/env node

import { BestMCP, tool, param, paramString, paramNumber, paramBoolean, paramObject, paramArray, paramEnum } from './dist/index.js';

// 测试服务类
class TestService {
  @tool({ description: "测试基本类型参数" })
  testBasicTypes(
    @paramString("name", false, "用户名称") name: string,
    @paramNumber("age", true, "用户年龄") age: number,
    @paramBoolean("isActive", false, "是否激活") isActive: boolean
  ) {
    return { name, age, isActive };
  }

  @tool({ description: "测试复杂类型参数" })
  testComplexTypes(
    @paramObject("user", true, {
      name: { type: "string", description: "用户名" },
      email: { type: "string", description: "邮箱" }
    }, "用户对象") user: any,
    @paramArray("tags", false, { type: "string" }, "标签数组") tags: string[],
    @paramEnum("status", ["active", "inactive", "pending"], true, "状态枚举") status: string
  ) {
    return { user, tags, status };
  }

  @tool({ description: "测试 JSON Schema 类型参数" })
  testSchemaTypes(
    @param({
      type: "object",
      properties: {
        id: { type: "number", minimum: 1 },
        title: { type: "string", minLength: 1 },
        config: {
          type: "object",
          properties: {
            theme: { type: "string", enum: ["light", "dark"] },
            notifications: { type: "boolean" }
          }
        }
      },
      required: ["id", "title"]
    }, true, "配置对象") config: any
  ) {
    return config;
  }

  @tool({ description: "测试向后兼容性" })
  testBackwardCompatibility(
    @param("message", true) message: string,
    @param("count", false) count: number = 1
  ) {
    return { message, count };
  }
}

// 测试函数
function testDecorators() {
  console.log("=== 测试增强的 @param 装饰器 ===\n");
  
  const mcp = new BestMCP("test-mcp", "1.0.0");
  mcp.register(TestService);
  
  const tools = mcp.getTools();
  
  console.log(`注册的工具数量: ${tools.length}\n`);
  
  tools.forEach((tool, index) => {
    console.log(`工具 ${index + 1}: ${tool.name}`);
    console.log(`描述: ${tool.description}`);
    console.log("参数定义:");
    
    Object.entries(tool.parameters.properties).forEach(([paramName, schema]: [string, any]) => {
      console.log(`  - ${paramName}:`);
      console.log(`    类型: ${schema.type}`);
      console.log(`    必需: ${tool.parameters.required.includes(paramName)}`);
      if (schema.description) {
        console.log(`    描述: ${schema.description}`);
      }
      if (schema.enum) {
        console.log(`    枚举值: ${JSON.stringify(schema.enum)}`);
      }
      if (schema.items) {
        console.log(`    数组项: ${JSON.stringify(schema.items)}`);
      }
      if (schema.properties) {
        console.log(`    对象属性: ${Object.keys(schema.properties).join(", ")}`);
      }
    });
    
    console.log("---\n");
  });
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testDecorators();
}

export { testDecorators };