#!/usr/bin/env node

// 演示增强的 @param 装饰器的使用方法
// 注意：这个文件需要在支持装饰器的 TypeScript 环境中编译和运行

import { BestMCP, tool, param, paramString, paramNumber, paramBoolean, paramObject, paramArray, paramEnum } from './dist/index.js';

// 示例1：基本类型参数
class BasicTypeExample {
  @tool({ description: "用户信息处理工具" })
  processUserInfo(
    @paramString("username", true, "用户名，长度3-20个字符") username: string,
    @paramNumber("age", true, "用户年龄，必须大于0") age: number,
    @paramBoolean("isActive", false, "账户是否激活") isActive: boolean = false
  ) {
    return {
      message: `处理用户信息：${username}`,
      data: { username, age, isActive }
    };
  }
}

// 示例2：复杂类型参数
class ComplexTypeExample {
  @tool({ description: "产品搜索工具" })
  searchProducts(
    @paramObject("filters", false, {
      category: { type: "string", description: "产品类别" },
      priceRange: { 
        type: "object", 
        description: "价格范围",
        properties: {
          min: { type: "number", minimum: 0 },
          max: { type: "number", minimum: 0 }
        }
      },
      inStock: { type: "boolean", description: "是否仅显示有货" }
    }, "搜索过滤条件") filters: any,
    @paramArray("tags", false, { type: "string" }, "产品标签") tags: string[],
    @paramEnum("sortBy", ["price", "name", "rating"], false, "排序方式") sortBy: string = "name"
  ) {
    return {
      message: "搜索产品",
      filters,
      tags,
      sortBy
    };
  }
}

// 示例3：JSON Schema 直接定义
class SchemaExample {
  @tool({ description: "配置管理工具" })
  updateConfig(
    @param({
      type: "object",
      description: "应用配置",
      properties: {
        theme: { 
          type: "string", 
          enum: ["light", "dark", "auto"],
          description: "主题设置"
        },
        language: { 
          type: "string", 
          pattern: "^[a-z]{2}(-[A-Z]{2})?$",
          description: "语言代码，如 en-US"
        },
        notifications: {
          type: "object",
          properties: {
            email: { type: "boolean" },
            push: { type: "boolean" },
            sms: { type: "boolean" }
          }
        },
        security: {
          type: "object",
          properties: {
            twoFactorAuth: { type: "boolean" },
            sessionTimeout: { type: "number", minimum: 300 }
          },
          required: ["twoFactorAuth"]
        }
      },
      required: ["theme", "language"]
    }, true, "配置对象") config: any
  ) {
    return {
      message: "更新配置",
      config
    };
  }
}

// 示例4：向后兼容
class CompatibilityExample {
  @tool({ description: "简单的问候工具" })
  greet(
    @param("name", true) name: string,
    @param("times", false) times: number = 1
  ) {
    return {
      message: "Hello ".repeat(times) + name + "!"
    };
  }
}

// 使用示例
function demonstrateUsage() {
  console.log("=== 增强的 @param 装饰器使用示例 ===\n");
  
  const mcp = new BestMCP("enhanced-mcp", "1.0.0");
  
  // 注册所有示例类
  mcp.register(BasicTypeExample);
  mcp.register(ComplexTypeExample);
  mcp.register(SchemaExample);
  mcp.register(CompatibilityExample);
  
  const tools = mcp.getTools();
  
  console.log(`成功注册 ${tools.length} 个工具\n`);
  
  tools.forEach((tool, index) => {
    console.log(`${index + 1}. ${tool.name}`);
    console.log(`   描述: ${tool.description}`);
    
    // 显示参数信息
    const requiredParams = tool.parameters.required;
    Object.entries(tool.parameters.properties).forEach(([paramName, schema]: [string, any]) => {
      const isRequired = requiredParams.includes(paramName);
      const requiredMark = isRequired ? "必需" : "可选";
      console.log(`   - ${paramName} (${requiredMark})`);
      console.log(`     类型: ${schema.type}`);
      if (schema.description) {
        console.log(`     描述: ${schema.description}`);
      }
      if (schema.enum) {
        console.log(`     枚举: ${schema.enum.join(", ")}`);
      }
      if (schema.items) {
        console.log(`     数组项: ${JSON.stringify(schema.items)}`);
      }
      if (schema.properties) {
        console.log(`     属性: ${Object.keys(schema.properties).join(", ")}`);
      }
      if (schema.default !== undefined) {
        console.log(`     默认值: ${schema.default}`);
      }
    });
    
    console.log();
  });
  
  console.log("=== 功能特点 ===");
  console.log("1. 支持基本的 TypeScript 类型推断");
  console.log("2. 提供 JSON Schema 完整定义能力");
  console.log("3. 便捷的类型装饰器函数");
  console.log("4. 向后兼容现有代码");
  console.log("5. 丰富的参数验证规则");
  console.log("6. 清晰的参数描述信息");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateUsage();
}

export { demonstrateUsage };