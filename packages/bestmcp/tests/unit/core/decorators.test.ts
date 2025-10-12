import { beforeEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { z } from "zod";
import { Param, Tool } from "../../../src/core/decorators";
import { TOOL_PARAM_METADATA, TOOLS_METADATA } from "../../../src/core/types";

describe("Tool decorator", () => {
  beforeEach(() => {
    // 清除任何现有的元数据
    Reflect.deleteMetadata(TOOLS_METADATA, {}, "testMethod");
  });

  it("should store tool metadata correctly", () => {
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

  it("should work without description", () => {
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

  it("should handle invalid inputs gracefully", () => {
    // 测试无效的装饰器参数
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    class TestService {}

    // 模拟无效的装饰器调用
    const _invalidDecorator = Tool("test")(null as any, "invalidMethod", null as any);

    expect(consoleSpy).toHaveBeenCalledWith("Tool decorator: descriptor or target is undefined for invalidMethod");

    consoleSpy.mockRestore();
  });

  it("should handle methods with no parameters", () => {
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

describe("Param decorator", () => {
  beforeEach(() => {
    // 清除任何现有的元数据
    Reflect.deleteMetadata(TOOL_PARAM_METADATA, {}, "testMethod");
  });

  it("should store parameter metadata correctly", () => {
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

  it("should handle optional parameters", () => {
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

  it("should work without description", () => {
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

  it("should handle undefined propertyKey gracefully", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    class TestService {}

    // 测试 undefined propertyKey 的情况
    const decorator = Param(z.string(), "test");
    decorator(TestService.prototype, undefined as any, 0);

    // 应该没有任何错误抛出
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle invalid method names", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    class TestService {}

    // 创建一个不存在的方法引用
    const decorator = Param(z.string(), "test");

    // 尝试在不存在的属性上应用装饰器
    expect(() => {
      decorator(TestService.prototype, "nonExistentMethod" as any, 0);
    }).toThrow("Method nonExistentMethod not found on target");

    consoleSpy.mockRestore();
  });

  it("should handle multiple parameters", () => {
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

  it("should extract parameter type information", () => {
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

describe("Decorator integration", () => {
  it("should work together with Tool and Param decorators", () => {
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
    const addTool = tools.find((t: any) => t.metadata.name === "add");
    expect(addTool).toBeDefined();
    expect(addTool.metadata.description).toBe("加法运算");

    // 检查第一个工具的参数元数据
    const addParams = Reflect.getMetadata(TOOL_PARAM_METADATA, MathService.prototype, "add") || [];
    expect(addParams).toHaveLength(2);
    expect(addParams[0].name).toBe("a");
    expect(addParams[1].name).toBe("b");

    // 检查第二个工具（concat 方法）
    const concatTool = tools.find((t: any) => t.metadata.name === "concat");
    expect(concatTool).toBeDefined();
    expect(concatTool.metadata.description).toBe("字符串连接");

    // 检查第二个工具的参数元数据
    const concatParams = Reflect.getMetadata(TOOL_PARAM_METADATA, MathService.prototype, "concat") || [];
    expect(concatParams).toHaveLength(2);
    expect(concatParams[0].name).toBe("a");
    expect(concatParams[1].name).toBe("b");
  });

  it("should handle mixed required and optional parameters", () => {
    class TestService {
      @Tool("混合参数测试")
      mixed(
        @Param(z.string(), "必填字符串") _required: string,
        @Param(z.number().optional(), "可选数字") _optional?: number,
        @Param(z.boolean(), "必填布尔") _requiredBool: boolean,
      ): void {
        // 实现
      }
    }

    const params = Reflect.getMetadata(TOOL_PARAM_METADATA, TestService.prototype, "mixed") || [];
    expect(params).toHaveLength(3);

    expect(params[0].name).toBe("required");
    expect(params[0].required).toBe(true);

    expect(params[1].name).toBe("optional");
    expect(params[1].required).toBe(false);

    expect(params[2].name).toBe("requiredBool");
    expect(params[2].required).toBe(true);
  });
});
