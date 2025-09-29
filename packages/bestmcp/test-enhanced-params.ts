#!/usr/bin/env node

import { BestMCP } from './dist/index.js';

// 手动创建测试工具元数据
const testToolMetadata = {
  name: "testBasicTypes",
  description: "测试基本类型参数",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "用户名称"
      },
      age: {
        type: "number",
        description: "用户年龄",
        minimum: 0
      },
      isActive: {
        type: "boolean",
        description: "是否激活",
        default: false
      }
    },
    required: ["age"]
  }
};

const testComplexToolMetadata = {
  name: "testComplexTypes",
  description: "测试复杂类型参数",
  parameters: {
    type: "object",
    properties: {
      user: {
        type: "object",
        description: "用户对象",
        properties: {
          name: { type: "string", description: "用户名" },
          email: { type: "string", description: "邮箱" }
        },
        required: ["name", "email"]
      },
      tags: {
        type: "array",
        description: "标签数组",
        items: { type: "string" }
      },
      status: {
        type: "string",
        description: "状态枚举",
        enum: ["active", "inactive", "pending"]
      }
    },
    required: ["user", "status"]
  }
};

// 测试函数
function testEnhancedParamDecorators() {
  console.log("=== 测试增强的 @param 装饰器功能 ===\n");
  
  const mcp = new BestMCP("test-mcp", "1.0.0");
  
  // 手动注册测试工具
  mcp.tools.set(testToolMetadata.name, {
    metadata: testToolMetadata,
    handler: (args: any) => args
  });
  
  mcp.tools.set(testComplexToolMetadata.name, {
    metadata: testComplexToolMetadata,
    handler: (args: any) => args
  });
  
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
      if (schema.default !== undefined) {
        console.log(`    默认值: ${schema.default}`);
      }
      if (schema.minimum !== undefined) {
        console.log(`    最小值: ${schema.minimum}`);
      }
    });
    
    console.log("---\n");
  });
  
  // 测试参数验证
  console.log("=== 测试参数验证 ===\n");
  
  // 测试1：正确参数
  const validArgs = {
    name: "John Doe",
    age: 30,
    isActive: true
  };
  
  const validation1 = mcp.validateTool(testToolMetadata.name, validArgs);
  console.log(`测试1 - 正确参数: ${validation1.isValid ? "通过" : "失败"}`);
  if (!validation1.isValid) {
    console.log(`错误: ${validation1.errors.join(", ")}`);
  }
  
  // 测试2：缺少必需参数
  const invalidArgs = {
    name: "John Doe"
    // 缺少必需的 age 参数
  };
  
  const validation2 = mcp.validateTool(testToolMetadata.name, invalidArgs);
  console.log(`测试2 - 缺少必需参数: ${validation2.isValid ? "通过" : "失败"}`);
  if (!validation2.isValid) {
    console.log(`错误: ${validation2.errors.join(", ")}`);
  }
  
  // 测试3：复杂类型参数
  const complexArgs = {
    user: {
      name: "John Doe",
      email: "john@example.com"
    },
    tags: ["tag1", "tag2"],
    status: "active"
  };
  
  const validation3 = mcp.validateTool(testComplexToolMetadata.name, complexArgs);
  console.log(`测试3 - 复杂类型参数: ${validation3.isValid ? "通过" : "失败"}`);
  if (!validation3.isValid) {
    console.log(`错误: ${validation3.errors.join(", ")}`);
  }
  
  console.log("\n=== 测试完成 ===");
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testEnhancedParamDecorators();
}

export { testEnhancedParamDecorators };