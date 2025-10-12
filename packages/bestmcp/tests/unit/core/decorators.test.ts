import { beforeEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { z } from "zod";
import { Param, Tool } from "../../../src/core/decorators";
import { TOOL_PARAM_METADATA, TOOLS_METADATA } from "../../../src/core/types";

describe("工具装饰器", () => {
  beforeEach(() => {
    // 清除任何现有的元数据
    Reflect.deleteMetadata(TOOLS_METADATA, {}, "testMethod");
  });

  it("应该正确存储工具元数据", () => {
    class TestService {
      @Tool("测试加法")
      add(a: number, b: number): number {
        return a + b;
      }
    }

    const tools = Reflect.getMetadata(TOOLS_METADATA, TestService) || [];
    expect(tools).toHaveLength(1);

    const tool = tools[0];
    expect(tool.metadata.name).toBe("add");
    expect(tool.metadata.description).toBe("测试加法");
    expect(tool.metadata.parameters.type).toBe("object");
    expect(tool.propertyKey).toBe("add");
    expect(typeof tool.method).toBe("function");
  });

  it("应该在没有描述时工作", () => {
    class TestService {
      @Tool()
      multiply(a: number, b: number): number {
        return a * b;
      }
    }

    const tools = Reflect.getMetadata(TOOLS_METADATA, TestService) || [];
    expect(tools).toHaveLength(1);

    const tool = tools[0];
    expect(tool.metadata.description).toBe("");
  });

  it("应该优雅地处理无效输入", () => {
    // 测试无效的装饰器参数
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    class TestService {}

    // 模拟无效的装饰器调用
    Tool("test")(null as unknown as object, "invalidMethod", null as unknown as PropertyDescriptor);

    expect(consoleSpy).toHaveBeenCalledWith("工具装饰器: 描述符或目标对象对于 invalidMethod 未定义");

    consoleSpy.mockRestore();
  });

  it("应该处理没有参数的方法", () => {
    class TestService {
      @Tool("无参数方法")
      noParams(): string {
        return "test";
      }
    }

    const tools = Reflect.getMetadata(TOOLS_METADATA, TestService) || [];
    expect(tools).toHaveLength(1);

    const tool = tools[0];
    expect(tool.metadata.name).toBe("noParams");
    expect(tool.metadata.parameters.properties).toEqual({});
    expect(tool.metadata.parameters.required).toEqual([]);
  });
});

describe("参数装饰器", () => {
  beforeEach(() => {
    // 清除任何现有的元数据
    Reflect.deleteMetadata(TOOL_PARAM_METADATA, {}, "testMethod");
  });

  it("应该正确存储参数元数据", () => {
    class TestService {
      testMethod(@Param(z.string(), "字符串参数") str: string): string {
        return str;
      }
    }

    const params = Reflect.getMetadata(TOOL_PARAM_METADATA, TestService.prototype, "testMethod") || [];
    expect(params).toHaveLength(1);

    const param = params[0];
    expect(param.name).toBe("str");
    expect(param.required).toBe(true);
    expect(param.index).toBe(0);
    expect(param.description).toBe("字符串参数");
    expect(param.zodSchema).toBeDefined();
  });

  it("应该处理可选参数", () => {
    class TestService {
      testMethod(@Param(z.string().optional(), "可选参数") str?: string): string {
        return str || "default";
      }
    }

    const params = Reflect.getMetadata(TOOL_PARAM_METADATA, TestService.prototype, "testMethod") || [];
    expect(params).toHaveLength(1);

    const param = params[0];
    expect(param.required).toBe(false);
  });

  it("应该在没有描述时工作", () => {
    class TestService {
      testMethod(@Param(z.number()) num: number): number {
        return num;
      }
    }

    const params = Reflect.getMetadata(TOOL_PARAM_METADATA, TestService.prototype, "testMethod") || [];
    expect(params).toHaveLength(1);

    const param = params[0];
    expect(param.description).toBeUndefined();
  });

  it("应该优雅地处理 undefined propertyKey", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    class TestService {}

    // 测试 undefined propertyKey 的情况
    const decorator = Param(z.string(), "test");
    decorator(TestService.prototype, undefined as unknown as string | symbol, 0);

    // 应该没有任何错误抛出
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("应该处理无效的方法名称", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    class TestService {}

    // 创建一个不存在的方法引用
    const decorator = Param(z.string(), "test");

    // 尝试在不存在的属性上应用装饰器
    expect(() => {
      decorator(TestService.prototype, "nonExistentMethod" as unknown as string | symbol, 0);
    }).toThrow("在目标对象上未找到方法 nonExistentMethod");

    consoleSpy.mockRestore();
  });

  it("应该处理多个参数", () => {
    class TestService {
      testMethod(@Param(z.string(), "第一个参数") str: string, @Param(z.number(), "第二个参数") num: number): string {
        return `${str}:${num}`;
      }
    }

    const params = Reflect.getMetadata(TOOL_PARAM_METADATA, TestService.prototype, "testMethod") || [];
    expect(params).toHaveLength(2);

    expect(params[0].name).toBe("str");
    expect(params[0].index).toBe(0);
    expect(params[0].description).toBe("第一个参数");

    expect(params[1].name).toBe("num");
    expect(params[1].index).toBe(1);
    expect(params[1].description).toBe("第二个参数");
  });

  it("应该提取参数类型信息", () => {
    class TestService {
      testMethod(@Param(z.string()) str: string): string {
        return str;
      }
    }

    const params = Reflect.getMetadata(TOOL_PARAM_METADATA, TestService.prototype, "testMethod") || [];
    expect(params).toHaveLength(1);

    const param = params[0];
    expect(param.name).toBe("str");
    expect(param.index).toBe(0);
    expect(param.zodSchema).toBeDefined();
    expect(param.required).toBe(true);
  });
});

describe("装饰器集成", () => {
  it("应该让工具和参数装饰器一起工作", () => {
    class MathService {
      @Tool("加法运算")
      add(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): number {
        return a + b;
      }

      @Tool("字符串连接")
      concat(@Param(z.string(), "第一个字符串") a: string, @Param(z.string(), "第二个字符串") b: string): string {
        return a + b;
      }
    }

    // 检查工具元数据
    const tools = Reflect.getMetadata(TOOLS_METADATA, MathService) || [];
    expect(tools).toHaveLength(2);

    // 检查第一个工具（add 方法）
    const addTool = tools.find((t: { metadata: { name: string } }) => t.metadata.name === "add");
    expect(addTool).toBeDefined();
    expect(addTool.metadata.description).toBe("加法运算");

    // 检查第一个工具的参数元数据
    const addParams = Reflect.getMetadata(TOOL_PARAM_METADATA, MathService.prototype, "add") || [];
    expect(addParams).toHaveLength(2);
    expect(addParams[0].name).toBe("a");
    expect(addParams[1].name).toBe("b");

    // 检查第二个工具（concat 方法）
    const concatTool = tools.find((t: { metadata: { name: string } }) => t.metadata.name === "concat");
    expect(concatTool).toBeDefined();
    expect(concatTool.metadata.description).toBe("字符串连接");

    // 检查第二个工具的参数元数据
    const concatParams = Reflect.getMetadata(TOOL_PARAM_METADATA, MathService.prototype, "concat") || [];
    expect(concatParams).toHaveLength(2);
    expect(concatParams[0].name).toBe("a");
    expect(concatParams[1].name).toBe("b");
  });

  it("应该处理混合必需和可选参数", () => {
    class TestService {
      @Tool("混合参数测试")
      mixed(
        @Param(z.string(), "必填字符串") _required: string,
        @Param(z.boolean(), "必填布尔") _requiredBool: boolean,
        @Param(z.number().optional(), "可选数字") _optional?: number,
      ): void {
        // 实现
      }
    }

    const params = Reflect.getMetadata(TOOL_PARAM_METADATA, TestService.prototype, "mixed") || [];
    expect(params).toHaveLength(3);

    expect(params[0].name).toBe("_required");
    expect(params[0].required).toBe(true);

    expect(params[1].name).toBe("_requiredBool");
    expect(params[1].required).toBe(true);

    expect(params[2].name).toBe("_optional");
    expect(params[2].required).toBe(false);
  });
});
