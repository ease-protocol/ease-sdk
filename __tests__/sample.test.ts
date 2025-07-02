import { api } from '../src/api/index.ts';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Module', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('api function', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await api('https://api.ease.tech/test', 'GET');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('https://api.ease.tech/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should make successful POST request with body', async () => {
      const mockResponse = { success: true };
      const requestBody = { test: 'data' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await api('https://api.ease.tech/test', 'POST', requestBody);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('https://api.ease.tech/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    });

    it('should handle callback endpoint with special publicKey handling', async () => {
      const mockResponse = { success: true };
      const requestBody = { publicKey: { test: 'credential' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await api('https://api.ease.tech/login/callback', 'POST', requestBody);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://api.ease.tech/login/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response: requestBody.publicKey }),
      });
    });

    it('should handle callback endpoint without publicKey property', async () => {
      const mockResponse = { success: true };
      const requestBody = { test: 'credential' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await api('https://api.ease.tech/join/callback', 'POST', requestBody);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://api.ease.tech/join/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response: requestBody }),
      });
    });

    it('should handle API error responses', async () => {
      const errorResponse = { error: 'Invalid request', message: 'Bad request' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorResponse),
      } as Response);

      const result = await api('https://api.ease.tech/test', 'GET');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid request');
      expect(result.errorDetails).toBeDefined();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      mockFetch.mockRejectedValueOnce(networkError);

      const result = await api('https://api.ease.tech/test', 'GET');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network connection failed');
      expect(result.errorDetails).toBeDefined();
      expect(result.statusCode).toBeUndefined(); // Network errors don't have status codes
    });

    it('should handle JSON parsing errors in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      const result = await api('https://api.ease.tech/test', 'GET');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON response from server');
      expect(result.errorDetails).toBeDefined();
    });

    it('should include custom headers', async () => {
      const mockResponse = { data: 'test' };
      const customHeaders = { Authorization: 'Bearer token' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await api('https://api.ease.tech/test', 'GET', null, customHeaders);

      expect(mockFetch).toHaveBeenCalledWith('https://api.ease.tech/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      });
    });
  });
});
