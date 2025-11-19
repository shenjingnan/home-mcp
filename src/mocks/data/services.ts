/**
 * Mock服务数据
 * 模拟Home Assistant中的可用服务
 */

// 灯光域服务
const lightServices = {
  light: [
    {
      name: "turn_on",
      description: "Turn a light on",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "light",
            },
          },
        },
        brightness_pct: {
          description: "Brightness percentage (1-100)",
          selector: {
            number: {
              min: 1,
              max: 100,
            },
          },
        },
        rgb_color: {
          description: "RGB color as [R, G, B]",
          selector: {
            color_rgb: {},
          },
        },
        color_temp: {
          description: "Color temperature in mireds",
          selector: {
            number: {
              min: 153,
              max: 500,
            },
          },
        },
      },
    },
    {
      name: "turn_off",
      description: "Turn a light off",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "light",
            },
          },
        },
      },
    },
    {
      name: "toggle",
      description: "Toggle a light",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "light",
            },
          },
        },
      },
    },
    {
      name: "dim",
      description: "Dim a light",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "light",
            },
          },
        },
        brightness_pct: {
          description: "Brightness percentage (1-100)",
          selector: {
            number: {
              min: 1,
              max: 100,
            },
          },
        },
      },
    },
  ],
};

// 开关域服务
const switchServices = {
  switch: [
    {
      name: "turn_on",
      description: "Turn a switch on",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "switch",
            },
          },
        },
      },
    },
    {
      name: "turn_off",
      description: "Turn a switch off",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "switch",
            },
          },
        },
      },
    },
    {
      name: "toggle",
      description: "Toggle a switch",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "switch",
            },
          },
        },
      },
    },
  ],
};

// 空调域服务
const climateServices = {
  climate: [
    {
      name: "turn_on",
      description: "Turn climate control on",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "climate",
            },
          },
        },
      },
    },
    {
      name: "turn_off",
      description: "Turn climate control off",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "climate",
            },
          },
        },
      },
    },
    {
      name: "set_temperature",
      description: "Set target temperature",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "climate",
            },
          },
        },
        temperature: {
          description: "Target temperature",
          selector: {
            number: {
              min: 10,
              max: 35,
            },
          },
        },
        hvac_mode: {
          description: "HVAC mode",
          selector: {
            select: {
              options: ["heat", "cool", "auto", "off"],
            },
          },
        },
      },
    },
    {
      name: "set_hvac_mode",
      description: "Set HVAC mode",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "climate",
            },
          },
        },
        hvac_mode: {
          description: "HVAC mode",
          selector: {
            select: {
              options: ["heat", "cool", "auto", "off"],
            },
          },
        },
      },
    },
  ],
};

// 覆盖器域服务
const coverServices = {
  cover: [
    {
      name: "open_cover",
      description: "Open a cover",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "cover",
            },
          },
        },
      },
    },
    {
      name: "close_cover",
      description: "Close a cover",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "cover",
            },
          },
        },
      },
    },
    {
      name: "set_cover_position",
      description: "Set cover position",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "cover",
            },
          },
        },
        position: {
          description: "Position percentage (0-100)",
          selector: {
            number: {
              min: 0,
              max: 100,
            },
          },
        },
      },
    },
    {
      name: "stop_cover",
      description: "Stop a moving cover",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "cover",
            },
          },
        },
      },
    },
  ],
};

// 摄像头域服务
const cameraServices = {
  camera: [
    {
      name: "enable_motion_detection",
      description: "Enable motion detection",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "camera",
            },
          },
        },
      },
    },
    {
      name: "disable_motion_detection",
      description: "Disable motion detection",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "camera",
            },
          },
        },
      },
    },
    {
      name: "turn_on",
      description: "Turn a camera on",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "camera",
            },
          },
        },
      },
    },
    {
      name: "turn_off",
      description: "Turn a camera off",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "camera",
            },
          },
        },
      },
    },
  ],
};

// 自动化域服务
const automationServices = {
  automation: [
    {
      name: "turn_on",
      description: "Enable automation",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "automation",
            },
          },
        },
      },
    },
    {
      name: "turn_off",
      description: "Disable automation",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "automation",
            },
          },
        },
      },
    },
    {
      name: "toggle",
      description: "Toggle automation",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "automation",
            },
          },
        },
      },
    },
    {
      name: "trigger",
      description: "Trigger automation",
      fields: {
        entity_id: {
          description: "Entity ID to target",
          selector: {
            entity: {
              domain: "automation",
            },
          },
        },
        skip_condition: {
          description: "Skip condition check",
          selector: {
            boolean: {},
          },
        },
      },
    },
  ],
};

// 通知域服务
const notifyServices = {
  notify: [
    {
      name: "persistent_notification",
      description: "Send a persistent notification",
      fields: {
        title: {
          description: "Notification title",
          selector: {
            text: {},
          },
        },
        message: {
          description: "Notification message",
          selector: {
            text: {},
          },
        },
        notification_id: {
          description: "Notification ID for updating",
          selector: {
            text: {},
          },
        },
      },
    },
    {
      name: "mobile_app",
      description: "Send notification to mobile app",
      fields: {
        title: {
          description: "Notification title",
          selector: {
            text: {},
          },
        },
        message: {
          description: "Notification message",
          selector: {
            text: {},
          },
        },
        target: {
          description: "Target device",
          selector: {
            text: {},
          },
        },
        data: {
          description: "Additional data",
          selector: {
            object: {},
          },
        },
      },
    },
  ],
};

// 系统域服务
const systemServices = {
  homeassistant: [
    {
      name: "restart",
      description: "Restart Home Assistant",
      fields: {},
    },
    {
      name: "stop",
      description: "Stop Home Assistant",
      fields: {},
    },
    {
      name: "save_config",
      description: "Save configuration",
      fields: {},
    },
    {
      name: "check_config",
      description: "Check configuration",
      fields: {},
    },
    {
      name: "reload_core_config",
      description: "Reload core configuration",
      fields: {},
    },
    {
      name: "reload_all",
      description: "Reload all configurations",
      fields: {},
    },
    {
      name: "update_entity",
      description: "Update entity state",
      fields: {
        entity_id: {
          description: "Entity ID to update",
          selector: {
            entity: {},
          },
        },
      },
    },
  ],
};

// 组合所有服务数据
export const mockServices = {
  ...lightServices,
  ...switchServices,
  ...climateServices,
  ...coverServices,
  ...cameraServices,
  ...automationServices,
  ...notifyServices,
  ...systemServices,
};

// 导出不同类型的服务
export const lightServiceNames = lightServices.light.map((s) => s.name);
export const switchServiceNames = switchServices.switch.map((s) => s.name);
export const climateServiceNames = climateServices.climate.map((s) => s.name);
export const coverServiceNames = coverServices.cover.map((s) => s.name);
export const cameraServiceNames = cameraServices.camera.map((s) => s.name);
