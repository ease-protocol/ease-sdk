import { internalApi as api } from '../api';
import { logger } from '../utils/logger';
import { AuthenticationError, ValidationError, ErrorCode, handleUnknownError, isEaseSDKError } from '../utils/errors';

/**
 * @module websocket
 * @description This module provides functions for interacting with the EASE WebSocket API.
 */

/**
 * Retrieves a WebSocket token from the EASE API.
 *
 * This token is required to authenticate and establish a WebSocket connection.
 * The token is short-lived and should be refreshed periodically.
 *
 * @param {string} accessToken - The user's access token.
 * @returns {Promise<string>} A promise that resolves to the WebSocket token.
 *
 * @throws {ValidationError} If the access token is missing or invalid.
 * @throws {AuthenticationError} If the access token is expired or otherwise invalid.
 * @throws {APIError} If the API request fails for any other reason.
 * @throws {NetworkError} If a network error occurs.
 */
export async function getWSToken(accessToken: string): Promise<string> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }

  if (accessToken.trim().length < 10) {
    throw new ValidationError('Access token appears to be invalid', 'accessToken', 'token too short');
  }

  try {
    logger.debug('Initiating WebSocket token request:', {
      tokenPrefix: accessToken.substring(0, 8) + '***',
    });

    const responseCallback = await api<{ token: string }>(
      '/ws/token',
      'POST',
      {},
      { Authorization: `Bearer ${accessToken.trim()}` },
    );

    if (!responseCallback.success) {
      logger.error('WebSocket token request failed:', {
        tokenPrefix: accessToken.substring(0, 8) + '***',
        error: responseCallback.error,
        statusCode: responseCallback.statusCode,
      });

      if (responseCallback.errorDetails && isEaseSDKError(responseCallback.errorDetails)) {
        throw responseCallback.errorDetails;
      }

      if (responseCallback.statusCode === 401) {
        throw new AuthenticationError('Invalid or expired access token', ErrorCode.UNAUTHORIZED, {
          tokenPrefix: accessToken.substring(0, 8),
        });
      }

      throw new AuthenticationError(
        responseCallback.error || 'Failed to get WebSocket token',
        ErrorCode.AUTHENTICATION_FAILED,
        {
          tokenPrefix: accessToken.substring(0, 8),
        },
      );
    }

    return responseCallback.data?.token || '';
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'getWSToken',
      tokenPrefix: accessToken.substring(0, 8),
    });

    logger.error('Unexpected error in getWSToken:', enhancedError);
    throw enhancedError;
  }
}

/**
 * @typedef {object} WebSocketHandlers
 * @property {(data: any) => void} onMessage - Callback function to handle incoming messages.
 * @property {(error: Error) => void} onError - Callback function to handle errors.
 * @property {() => void} onOpen - Callback function to handle the connection opening.
 */
export interface WebSocketHandlers {
  onMessage: (data: any) => void;
  onError: (error: Error) => void;
  onOpen: () => void;
}

/**
 * @typedef {object} ReconnectionConfig
 * @property {boolean} [enabled=true] - Whether to enable automatic reconnection.
 * @property {number} [maxAttempts=5] - Maximum number of reconnection attempts.
 * @property {number} [initialDelay=1000] - Initial delay in milliseconds before the first reconnection attempt.
 * @property {number} [maxDelay=30000] - Maximum delay in milliseconds between reconnection attempts.
 */
export interface ReconnectionConfig {
  enabled?: boolean;
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
}

/**
 * Connects to the EASE WebSocket server and sets up event handlers with automatic reconnection.
 *
 * @param {string} accessToken - The user's access token.
 * @param {WebSocketHandlers} handlers - An object containing callback functions for `onMessage`, `onError`, and `onOpen` events.
 * @param {ReconnectionConfig} [reconnectionConfig] - Configuration for automatic reconnection.
 * @returns {Promise<WebSocket>} A promise that resolves to the WebSocket instance. The `close` method on the instance is modified to prevent automatic reconnection.
 */
export function connectToWebSocket(
  accessToken: string,
  handlers: WebSocketHandlers,
  reconnectionConfig?: ReconnectionConfig,
): Promise<WebSocket> {
  let ws: WebSocket | null = null;
  let reconnectionAttempts = 0;
  let isClosed = false;

  const { enabled = true, maxAttempts = 5, initialDelay = 1000, maxDelay = 30000 } = reconnectionConfig || {};

  return new Promise<WebSocket>((resolve, reject) => {
    let promiseFulfilled = false;

    const connect = async () => {
      if (isClosed) return;

      try {
        const token = await getWSToken(accessToken);
        const url = `wss://staging.ws.ease.tech?token=${token}`;
        ws = new WebSocket(url);

        ws.addEventListener('open', () => {
          logger.debug('WebSocket connection opened');
          reconnectionAttempts = 0;
          handlers.onOpen();

          if (ws && !promiseFulfilled) {
            promiseFulfilled = true;
            // monkey patch close
            const originalClose = ws.close.bind(ws);
            ws.close = (...args) => {
              isClosed = true;
              originalClose(...args);
            };
            resolve(ws);
          }
        });

        ws.addEventListener('message', (event) => handlers.onMessage(event.data));
        ws.addEventListener('error', (event: Event) => handlers.onError((event as ErrorEvent).error as Error));
        ws.addEventListener('close', () => {
          if (isClosed || !enabled) return;

          if (reconnectionAttempts < maxAttempts) {
            reconnectionAttempts++;
            const delay = Math.min(initialDelay * Math.pow(2, reconnectionAttempts - 1), maxDelay);
            logger.debug(`WebSocket closed. Reconnecting in ${delay}ms...`);
            setTimeout(connect, delay);
          } else {
            const error = new Error('WebSocket reconnection failed after maximum attempts.');
            logger.error('WebSocket reconnection failed after maximum attempts.');
            handlers.onError(error);
            if (!promiseFulfilled) {
              promiseFulfilled = true;
              reject(error);
            }
          }
        });
      } catch (error) {
        handlers.onError(error as Error);
        if (!promiseFulfilled) {
          promiseFulfilled = true;
          reject(error as Error);
        }
      }
    };

    connect();
  });
}

/**
 * @typedef {string | ArrayBufferLike | Blob | ArrayBufferView} WebSocketMessage
 */
export type WebSocketMessage = string | ArrayBufferLike | Blob | ArrayBufferView;

/**
 * Sends a message over the provided WebSocket connection.
 *
 * @param {WebSocket} ws - The WebSocket instance to send the message through.
 * @param {WebSocketMessage} message - The message to send. Can be a string, ArrayBuffer, Blob, or ArrayBufferView.
 * @returns {void}
 * @throws {Error} If the WebSocket is not open or if an error occurs during sending.
 */
export function sendMessage(ws: WebSocket, message: WebSocketMessage): void {
  if (ws.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket is not open. ReadyState: ' + ws.readyState);
  }
  ws.send(message);
}
