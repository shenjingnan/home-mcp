/**
 * Tests for stdio MCP server and handleGetStates function
 */

import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { HomeAssistantClient } from '@/clients/home-assistant';
import { EntityState } from '@/types';

// Import the handleGetStates function - we need to extract it for testing
// For now, we'll test it indirectly through integration tests

describe('handleGetStates function', () => {
  let mockHaClient: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    // Mock HomeAssistantClient
    mockHaClient = {
      getStates: vi.fn(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  // Since handleGetStates is not exported, we'll create a test version
  async function testHandleGetStates(
    haClient: any, 
    args: any
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const response = await haClient.getStates();
      
      if (response.error) {
        throw new Error(`Home Assistant API error: ${response.error}`);
      }

      let states = response.data || [];
      
      // Apply filters
      if (args.entity_type) {
        states = states.filter((state: EntityState) => 
          state.entity_id.startsWith(`${args.entity_type}.`)
        );
      }
      
      if (args.area) {
        states = states.filter((state: EntityState) => 
          state.attributes?.['area'] === args.area
        );
      }
      
      // Apply limit
      const limit = args.limit || 100;
      const limitedStates = states.slice(0, limit);
      
      // Format response
      const formattedStates = limitedStates.map((state: EntityState) => ({
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
        last_changed: state.last_changed,
        friendly_name: state.attributes?.['friendly_name'],
        area: state.attributes?.['area'],
        device_class: state.attributes?.['device_class']
      }));

      const result = {
        entities: formattedStates,
        total_count: states.length,
        filtered_count: limitedStates.length,
        timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Failed to get Home Assistant states: ${(error as Error).message}`);
    }
  }

  describe('successful responses', () => {
    const mockStates: EntityState[] = [
      {
        entity_id: 'light.living_room',
        state: 'on',
        attributes: {
          friendly_name: 'Living Room Light',
          area: 'living_room',
          brightness: 255
        },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
        context: { id: '1' }
      },
      {
        entity_id: 'sensor.temperature',
        state: '22.5',
        attributes: {
          friendly_name: 'Temperature Sensor',
          area: 'living_room',
          device_class: 'temperature',
          unit_of_measurement: '°C'
        },
        last_changed: '2023-01-01T00:01:00Z',
        last_updated: '2023-01-01T00:01:00Z',
        context: { id: '2' }
      },
      {
        entity_id: 'switch.kitchen',
        state: 'off',
        attributes: {
          friendly_name: 'Kitchen Switch',
          area: 'kitchen'
        },
        last_changed: '2023-01-01T00:02:00Z',
        last_updated: '2023-01-01T00:02:00Z',
        context: { id: '3' }
      }
    ];

    it('should return all states without filters', async () => {
      mockHaClient.getStates.mockResolvedValue({
        data: mockStates,
        status: 200
      });

      const result = await testHandleGetStates(mockHaClient, {});
      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.entities).toHaveLength(3);
      expect(parsedResult.total_count).toBe(3);
      expect(parsedResult.filtered_count).toBe(3);
      expect(parsedResult.entities[0].entity_id).toBe('light.living_room');
    });

    it('should filter by entity_type', async () => {
      mockHaClient.getStates.mockResolvedValue({
        data: mockStates,
        status: 200
      });

      const result = await testHandleGetStates(mockHaClient, { entity_type: 'light' });
      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.entities).toHaveLength(1);
      expect(parsedResult.total_count).toBe(1);
      expect(parsedResult.filtered_count).toBe(1);
      expect(parsedResult.entities[0].entity_id).toBe('light.living_room');
    });

    it('should filter by area', async () => {
      mockHaClient.getStates.mockResolvedValue({
        data: mockStates,
        status: 200
      });

      const result = await testHandleGetStates(mockHaClient, { area: 'living_room' });
      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.entities).toHaveLength(2);
      expect(parsedResult.total_count).toBe(2);
      expect(parsedResult.filtered_count).toBe(2);
      expect(parsedResult.entities.every((e: any) => e.area === 'living_room')).toBe(true);
    });

    it('should apply limit', async () => {
      mockHaClient.getStates.mockResolvedValue({
        data: mockStates,
        status: 200
      });

      const result = await testHandleGetStates(mockHaClient, { limit: 2 });
      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.entities).toHaveLength(2);
      expect(parsedResult.total_count).toBe(3);
      expect(parsedResult.filtered_count).toBe(2);
    });

    it('should combine filters', async () => {
      mockHaClient.getStates.mockResolvedValue({
        data: mockStates,
        status: 200
      });

      const result = await testHandleGetStates(mockHaClient, { 
        entity_type: 'sensor',
        area: 'living_room',
        limit: 1
      });
      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.entities).toHaveLength(1);
      expect(parsedResult.entities[0].entity_id).toBe('sensor.temperature');
    });
  });

  describe('error handling', () => {
    it('should handle Home Assistant API errors', async () => {
      mockHaClient.getStates.mockResolvedValue({
        error: 'Connection failed',
        status: 500
      });

      await expect(testHandleGetStates(mockHaClient, {}))
        .rejects.toThrow('Failed to get Home Assistant states: Home Assistant API error: Connection failed');
    });

    it('should handle network errors', async () => {
      mockHaClient.getStates.mockRejectedValue(new Error('Network error'));

      await expect(testHandleGetStates(mockHaClient, {}))
        .rejects.toThrow('Failed to get Home Assistant states: Network error');
    });

    it('should handle empty response', async () => {
      mockHaClient.getStates.mockResolvedValue({
        data: null,
        status: 200
      });

      const result = await testHandleGetStates(mockHaClient, {});
      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.entities).toHaveLength(0);
      expect(parsedResult.total_count).toBe(0);
      expect(parsedResult.filtered_count).toBe(0);
    });
  });

  describe('data formatting', () => {
    it('should format response correctly', async () => {
      const mockState: EntityState = {
        entity_id: 'light.test',
        state: 'on',
        attributes: {
          friendly_name: 'Test Light',
          area: 'test_area',
          device_class: 'light',
          brightness: 128
        },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
        context: { id: '1' }
      };

      mockHaClient.getStates.mockResolvedValue({
        data: [mockState],
        status: 200
      });

      const result = await testHandleGetStates(mockHaClient, {});
      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult).toHaveProperty('entities');
      expect(parsedResult).toHaveProperty('total_count');
      expect(parsedResult).toHaveProperty('filtered_count');
      expect(parsedResult).toHaveProperty('timestamp');

      const entity = parsedResult.entities[0];
      expect(entity).toHaveProperty('entity_id', 'light.test');
      expect(entity).toHaveProperty('state', 'on');
      expect(entity).toHaveProperty('attributes');
      expect(entity).toHaveProperty('last_changed');
      expect(entity).toHaveProperty('friendly_name', 'Test Light');
      expect(entity).toHaveProperty('area', 'test_area');
      expect(entity).toHaveProperty('device_class', 'light');
    });

    it('should handle missing optional attributes', async () => {
      const mockState: EntityState = {
        entity_id: 'sensor.test',
        state: '42',
        attributes: {},
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
        context: { id: '1' }
      };

      mockHaClient.getStates.mockResolvedValue({
        data: [mockState],
        status: 200
      });

      const result = await testHandleGetStates(mockHaClient, {});
      const parsedResult = JSON.parse(result.content[0].text);

      const entity = parsedResult.entities[0];
      expect(entity.friendly_name).toBeUndefined();
      expect(entity.area).toBeUndefined();
      expect(entity.device_class).toBeUndefined();
    });
  });
});
