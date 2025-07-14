import { internalApi } from '../src/api/index';

jest.mock('../src/api/index', () => ({
  internalApi: jest.fn(),
}));

describe('API Module', () => {
  const mockInternalApi = internalApi as jest.MockedFunction<typeof internalApi>;

  beforeEach(() => {
    mockInternalApi.mockClear();
  });

  describe('api function', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test' };
      mockInternalApi.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
        statusCode: 200,
      });

      const result = await internalApi('/test', 'GET', null, undefined, false, false);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockInternalApi).toHaveBeenCalledWith('/test', 'GET', null, undefined, false, false);
    });

    it('should make successful POST request with body', async () => {
      const mockResponse = { success: true };
      const requestBody = { test: 'data' };
      mockInternalApi.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
        statusCode: 200,
      });

      const result = await internalApi('/test', 'POST', requestBody);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockInternalApi).toHaveBeenCalledWith('/test', 'POST', requestBody);
    });

    it('should handle callback endpoint with special publicKey handling', async () => {
      const mockResponse = { success: true };
      const requestBody = { publicKey: { test: 'credential' } };
      mockInternalApi.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
        statusCode: 200,
      });

      const result = await internalApi('/login/callback', 'POST', requestBody);

      expect(result.success).toBe(true);
      expect(mockInternalApi).toHaveBeenCalledWith('/login/callback', 'POST', requestBody);
    });

    it('should handle callback endpoint without publicKey property', async () => {
      const mockResponse = { success: true };
      const requestBody = { test: 'credential' };
      mockInternalApi.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
        statusCode: 200,
      });

      const result = await internalApi('/join/callback', 'POST', requestBody);

      expect(result.success).toBe(true);
      expect(mockInternalApi).toHaveBeenCalledWith('/join/callback', 'POST', requestBody);
    });

    it('should handle API error responses', async () => {
      const errorResponse = { error: 'Invalid request', message: 'Bad request' };
      mockInternalApi.mockResolvedValueOnce({
        success: false,
        error: errorResponse.error,
        statusCode: 400,
        errorDetails: new Error('API Error') as any,
      });

      const result = await internalApi('/test', 'GET', null, undefined, false, false);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid request');
      expect(result.errorDetails).toBeDefined();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      mockInternalApi.mockResolvedValueOnce({
        success: false,
        error: networkError.message,
        errorDetails: networkError as any,
      });

      const result = await internalApi('/test', 'GET', null, undefined, false, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network connection failed');
      expect(result.errorDetails).toBeDefined();
      expect(result.statusCode).toBeUndefined(); // Network errors don't have status codes
    });

    it('should handle JSON parsing errors in response', async () => {
      mockInternalApi.mockResolvedValueOnce({
        success: false,
        error: 'Invalid JSON response from server',
        errorDetails: new Error('JSON Parse Error') as any,
      });

      const result = await internalApi('/test', 'GET', null, undefined, false, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON response from server');
      expect(result.errorDetails).toBeDefined();
    });

    it('should include custom headers', async () => {
      const mockResponse = { data: 'test' };
      const customHeaders = { Authorization: 'Bearer token' };
      mockInternalApi.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
        statusCode: 200,
      });

      await internalApi('/test', 'GET', null, customHeaders);

      expect(mockInternalApi).toHaveBeenCalledWith('/test', 'GET', null, customHeaders);
    });
  });
});
