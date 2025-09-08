/**
 * Tests for HomeAssistantClient
 */

import { HomeAssistantClient } from './home-assistant';
import { HomeAssistantConfig } from '@/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('HomeAssistantClient', () => {
  let client: HomeAssistantClient;
  let mockConfig: HomeAssistantConfig;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockClear();

    mockConfig = {
      baseUrl: 'http://localhost:8123',
      accessToken: 'test-token',
      timeout: 5000,
      retryAttempts: 2,
      retryDelay: 100,
    };

    client = new HomeAssistantClient(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(client).toBeInstanceOf(HomeAssistantClient);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'API running.' }),
      } as Response);

      const result = await client.testConnection();
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8123/api/',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should return false for failed connection', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });

    it('should return false for HTTP error response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getStates', () => {
    it('should return entity states successfully', async () => {
      const mockStates = [
        {
          entity_id: 'light.living_room',
          state: 'on',
          attributes: { brightness: 255 },
          last_changed: '2023-01-01T00:00:00Z',
          last_updated: '2023-01-01T00:00:00Z',
          context: { id: '123' },
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStates,
      } as Response);

      const result = await client.getStates();
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockStates);
      expect(result.error).toBeUndefined();
    });

    it('should handle API errors', async () => {
      // Mock multiple rejections for retry attempts
      fetchMock
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockRejectedValueOnce(new Error('Network connection failed'));

      const result = await client.getStates();
      expect(result.status).toBe(0);
      expect(result.error).toContain('Network connection failed');
    });
  });

  describe('getEntityState', () => {
    it('should return specific entity state', async () => {
      const mockState = {
        entity_id: 'light.living_room',
        state: 'on',
        attributes: { brightness: 255 },
        last_changed: '2023-01-01T00:00:00Z',
        last_updated: '2023-01-01T00:00:00Z',
        context: { id: '123' },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockState,
      } as Response);

      const result = await client.getEntityState('light.living_room');
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockState);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8123/api/states/light.living_room',
        expect.any(Object)
      );
    });
  });

  describe('callService', () => {
    it('should call service successfully', async () => {
      const mockResponse = { success: true };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await client.callService('light', 'turn_on', { brightness: 255 });
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8123/api/services/light/turn_on',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ service_data: { brightness: 255 } }),
        })
      );
    });

    it('should include target in service call', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      await client.callService(
        'light',
        'turn_on',
        { brightness: 255 },
        { entity_id: 'light.living_room' }
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8123/api/services/light/turn_on',
        expect.objectContaining({
          body: JSON.stringify({
            service_data: { brightness: 255 },
            target: { entity_id: 'light.living_room' },
          }),
        })
      );
    });
  });

  describe('retry mechanism', () => {
    it('should retry on network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      const result = await client.getStates();
      expect(result.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retry attempts', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getStates();
      expect(result.error).toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        baseUrl: 'http://new-host:8123',
        accessToken: 'new-token',
      };

      client.updateConfig(newConfig);

      // Test that new config is used in next request
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      client.testConnection();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://new-host:8123/api/',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer new-token',
          }),
        })
      );
    });
  });
});
