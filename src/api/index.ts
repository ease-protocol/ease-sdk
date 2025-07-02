import { logger } from '../utils/logger';
import { NetworkError, createErrorFromAPIResponse, handleUnknownError } from '../utils/errors';

import type { EaseSDKError } from '../utils/errors';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  errorDetails?: EaseSDKError;
  headers?: Headers;
};

export const api = async <T>(
  url: string,
  method: string,
  body: any = null,
  headers: Record<string, string> | undefined = undefined,
  fromEnclave: boolean = false,
): Promise<ApiResponse<T>> => {
  try {
    const baseUrl = fromEnclave ? 'https://relay.ease.tech/' : 'https://api.ease.tech/';
    const fullUrl = `${baseUrl}${url.startsWith('/') ? url.substring(1) : url}`;

    const urlObj = new URL(fullUrl);
    const path = urlObj.pathname;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body !== null && method !== 'GET' && method !== 'HEAD') {
      const bodyString = JSON.stringify(path.includes('callback') ? { response: body.publicKey ?? body } : body);

      options.body = bodyString;
    }

    const response = await fetch(fullUrl, options);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        logger.error('API error response:', {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
      } catch (jsonError) {
        logger.error('Failed to parse error response as JSON:', {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          parseError: jsonError,
        });
        errorData = {
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const apiError = createErrorFromAPIResponse(response.status, errorData, { url, method, headers });

      return {
        success: false,
        error: apiError.message,
        statusCode: response.status,
        errorDetails: apiError,
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      logger.error('Failed to parse successful response as JSON:', {
        url,
        method,
        status: response.status,
        parseError: jsonError,
      });
      throw new NetworkError('Invalid JSON response from server', jsonError as Error, {
        url,
        method,
        status: response.status,
      });
    }

    return {
      success: true,
      data,
      headers: response.headers,
    };
  } catch (error: any) {
    logger.error('Network request failed:', {
      url,
      method,
      error: error.message,
      cause: error.cause,
    });

    const networkError = handleUnknownError(error, { url, method });

    return {
      success: false,
      error: networkError.message,
      errorDetails: networkError,
    };
  }
};
