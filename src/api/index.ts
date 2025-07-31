import { getUrl } from '../utils/urls';
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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export async function internalApi<T, B = any>(
  url: string,
  method: HttpMethod,
  body: B = null as B,
  headers: Record<string, string> | undefined = undefined,
  fromEnclave: boolean = false,
  isAbsoluteUrl: boolean = false,
  timeout: number = 5000,
): Promise<ApiResponse<T>> {
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const baseUrl = fromEnclave ? getUrl('EASE_RELAY') : getUrl('EASE_API');
    const fullUrl = isAbsoluteUrl ? url : `${baseUrl}${url.startsWith('/') ? url.substring(1) : url}`;

    
    

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    };

    if (body !== null && method !== 'GET' && method !== 'HEAD') {
      const bodyString = JSON.stringify(
        body,
        // path.includes('callback') && !path.includes('transaction') ? { response: body.publicKey ?? body } : body,
      );

      options.body = bodyString;
    }

    logger.debug(`Request options for ${fullUrl}:`, method, headers, options.body);

    const response = await fetch(fullUrl, options);

    logger.debug(`Response ok:${response.ok} status:${response.status} for ${fullUrl}:`);

    let loggedErrorData = false;
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        logger.error('API error response not ok:', {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        loggedErrorData = true;
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

      if (errorData && !loggedErrorData) {
        logger.error('API error response:', errorData);
      }

      const apiError = createErrorFromAPIResponse(response.status, errorData, { url, method, headers });

      if (apiError) {
        logger.error('API error:', apiError);
      }

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
    logger.error('** error: ', error);

    if (error.name === 'AbortError') {
      logger.error('Network request timed out:', {
        url,
        method,
        timeout,
      });
      return {
        success: false,
        error: 'Request timed out',
        errorDetails: new NetworkError('Request timed out', error, { url, method }),
      };
    }

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
  } finally {
    clearTimeout(timeoutId);
  }
}
