import { getWSToken, connectToWebSocket, sendMessage } from '../src/websocket';
import { AuthenticationError, ErrorCode } from '../src/utils/errors';
import { logger, LogLevel } from '../src/utils/logger';

// Mock the internalApi
jest.mock('../src/api', () => ({
  internalApi: jest.fn(),
}));

// Import the mocked internalApi
import { internalApi } from '../src/api';

// Mock the global WebSocket class
let mockWebSocket: {
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  close: jest.Mock;
  readyState: number;
  onopen?: () => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: Event) => void;
  onclose?: (event: CloseEvent) => void;
  send: jest.Mock;
};

let mockCloseFn: jest.Mock;

const MockWebSocketConstructor = jest.fn().mockImplementation(() => {
  mockCloseFn = jest.fn(() => {
    mockWebSocket.readyState = 3; // CLOSED
    if (mockWebSocket.onclose) mockWebSocket.onclose({ code: 1000, reason: 'mock close' } as CloseEvent);
  });

  mockWebSocket = {
    addEventListener: jest.fn((event, callback) => {
      if (event === 'open') mockWebSocket.onopen = callback;
      if (event === 'message') mockWebSocket.onmessage = callback;
      if (event === 'error') mockWebSocket.onerror = callback;
      if (event === 'close') mockWebSocket.onclose = callback;
    }),
    removeEventListener: jest.fn(),
    close: mockCloseFn,
    readyState: 0, // CONNECTING
    send: jest.fn(),
  };
  return mockWebSocket;
});

Object.defineProperty(MockWebSocketConstructor, 'OPEN', { value: 1 });
Object.defineProperty(MockWebSocketConstructor, 'CLOSED', { value: 3 });

describe('WebSocket Module', () => {
  beforeAll(() => {
    global.WebSocket = MockWebSocketConstructor as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (internalApi as jest.Mock).mockClear();
    logger.configure({ level: LogLevel.SILENT });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getWSToken', () => {
    const validAccessToken = 'valid-access-token-12345';

    it('should get a WebSocket token successfully', async () => {
      const mockToken = 'mock-ws-token';
      (internalApi as jest.Mock).mockResolvedValueOnce({ success: true, data: { token: mockToken } });
      const token = await getWSToken(validAccessToken);
      expect(token).toBe(mockToken);
      expect(internalApi).toHaveBeenCalledWith('/ws/token', 'POST', {}, { Authorization: `Bearer ${validAccessToken}` });
    });
  });

  describe('connectToWebSocket', () => {
    const validAccessToken = 'valid-access-token-12345';
    const mockToken = 'mock-ws-token';
    let mockHandlers: {
      onMessage: jest.Mock;
      onError: jest.Mock;
      onOpen: jest.Mock;
    };

    beforeEach(() => {
      (internalApi as jest.Mock).mockResolvedValue({ success: true, data: { token: mockToken } });
      mockHandlers = {
        onMessage: jest.fn(),
        onError: jest.fn(),
        onOpen: jest.fn(),
      };
    });

    it('should connect and call onOpen', async () => {
      const wsPromise = connectToWebSocket(validAccessToken, mockHandlers);
      await jest.runAllTimersAsync();
      mockWebSocket.onopen!();
      const ws = await wsPromise;
      expect(mockHandlers.onOpen).toHaveBeenCalled();
      expect(ws).toBe(mockWebSocket);
    });

    it('should attempt to reconnect on close', async () => {
      const wsPromise = connectToWebSocket(validAccessToken, mockHandlers);
      await jest.runAllTimersAsync();
      mockWebSocket.onopen!();
      await wsPromise;

      expect(internalApi).toHaveBeenCalledTimes(1);

      mockWebSocket.onclose!({ code: 1006, reason: 'abnormal closure' } as CloseEvent);
      await jest.runAllTimersAsync();
      mockWebSocket.onopen!();
      expect(internalApi).toHaveBeenCalledTimes(2);
    });

    it('should not reconnect if disabled', async () => {
      const wsPromise = connectToWebSocket(validAccessToken, mockHandlers, { enabled: false });
      await jest.runAllTimersAsync();
      mockWebSocket.onopen!();
      await wsPromise;

      expect(internalApi).toHaveBeenCalledTimes(1);

      mockWebSocket.onclose!({ code: 1006, reason: 'abnormal closure' } as CloseEvent);
      await jest.runAllTimersAsync();
      expect(internalApi).toHaveBeenCalledTimes(1);
    });

    it('should stop reconnecting after max attempts', async () => {
      const maxAttempts = 2;
      const promise = connectToWebSocket(validAccessToken, mockHandlers, { maxAttempts });

      // Initial attempt
      await jest.runAllTimersAsync();
      expect(internalApi).toHaveBeenCalledTimes(1);
      mockWebSocket.onclose!({ code: 1006, reason: 'abnormal closure' } as CloseEvent);

      // 1st reconnect
      await jest.runAllTimersAsync();
      expect(internalApi).toHaveBeenCalledTimes(2);
      mockWebSocket.onclose!({ code: 1006, reason: 'abnormal closure' } as CloseEvent);

      // 2nd reconnect
      await jest.runAllTimersAsync();
      expect(internalApi).toHaveBeenCalledTimes(3);
      mockWebSocket.onclose!({ code: 1006, reason: 'abnormal closure' } as CloseEvent);

      // Max attempts reached, should reject
      await expect(promise).rejects.toThrow('WebSocket reconnection failed after maximum attempts.');
      expect(internalApi).toHaveBeenCalledTimes(3);
      expect(mockHandlers.onError).toHaveBeenCalledWith(expect.any(Error));
      expect(mockHandlers.onError.mock.calls[0][0].message).toBe(
        'WebSocket reconnection failed after maximum attempts.',
      );
    });

    it('should call onError when getWSToken fails', async () => {
      const originalError = new Error('Failed to get token');
      (internalApi as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: originalError.message,
        statusCode: 401,
      });

      await expect(connectToWebSocket(validAccessToken, mockHandlers)).rejects.toThrow(AuthenticationError);

      expect(mockHandlers.onError).toHaveBeenCalledWith(expect.any(AuthenticationError));
      const receivedError = mockHandlers.onError.mock.calls[0][0];
      expect(receivedError.message).toBe('Invalid or expired access token');
      expect(receivedError.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should close the connection when close is called', async () => {
      const wsPromise = connectToWebSocket(validAccessToken, mockHandlers);
      await jest.runAllTimersAsync();
      mockWebSocket.onopen!();
      const ws = await wsPromise;
      ws.close();
      expect(mockCloseFn).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      mockWebSocket.readyState = 1; // OPEN
    });

    it('should send a message when the WebSocket is open', () => {
      const message = 'test message';
      sendMessage(mockWebSocket as any, message);
      expect(mockWebSocket.send).toHaveBeenCalledWith(message);
    });

    it('should throw an error if the WebSocket is not open', () => {
      mockWebSocket.readyState = 3; // CLOSED
      const message = 'test message';
      expect(() => sendMessage(mockWebSocket as any, message)).toThrow('WebSocket is not open. ReadyState: 3');
    });
  });
});
