// api.ts
import { getUrl } from '../utils/urls';
import { logger } from '../utils/logger';
import { NetworkError, createErrorFromAPIResponse, handleUnknownError } from '../utils/errors';
import type { EaseSDKError } from '../utils/errors';

// 🔹 add:
import { _notify } from '../core/telemetry';
import { randomUUID } from '../core/randomId';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  errorDetails?: EaseSDKError;
  headers?: Headers;
};
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

function redactHeader(k: string, v: string) {
  return /authorization|token|cookie|set-cookie/i.test(k) ? 'REDACTED' : v;
}

function headersToRecord(h: Headers | Record<string, string> | undefined) {
  try {
    if (!h) return undefined;
    if (h instanceof Headers) return Object.fromEntries([...h.entries()].map(([k, v]) => [k, redactHeader(k, v)]));
    return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, redactHeader(k, v)]));
  } catch {
    return undefined;
  }
}

const now = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());

const toPath = (u: string) => {
  try {
    return new URL(u).pathname;
  } catch {
    return undefined;
  }
};

const serviceFrom = (fullUrl: string, fromEnclave: boolean, isAbsoluteUrl: boolean) => {
  if (!isAbsoluteUrl) return fromEnclave ? 'EASE_RELAY' : 'EASE_API';
  if (fullUrl.includes('mempool.space')) return 'MEMPOOL_SPACE';
  if (fullUrl.includes('etherscan')) return 'ETHERSCAN_PROXY'; // adjust to your proxy hostname
  return 'EXTERNAL';
};

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

  // 🔹 correlation + timer
  const requestId = randomUUID();
  const startPerf = now();

  try {
    const baseUrl = fromEnclave ? getUrl('EASE_RELAY') : getUrl('EASE_API');
    const fullUrl = isAbsoluteUrl ? url : `${baseUrl}${url}`;
    const origin: 'internal' | 'external' = isAbsoluteUrl && !fullUrl.includes(baseUrl) ? 'external' : 'internal';
    const service = serviceFrom(fullUrl, fromEnclave, isAbsoluteUrl);
    const path = toPath(fullUrl);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // 🔹 only add correlation header for our own services
    if (origin === 'internal') requestHeaders['x-client-request-id'] = requestId;

    const options: RequestInit = { method, headers: requestHeaders, signal: controller.signal };

    let bodySize: number | undefined;
    if (body !== null && method !== 'GET' && method !== 'HEAD') {
      const bodyString = JSON.stringify(body);
      options.body = bodyString;
      try {
        bodySize =
          typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(bodyString).byteLength : bodyString.length;
      } catch {}
    }

    // 🔹 notify request
    _notify.request({
      requestId,
      method,
      url: fullUrl,
      path,
      startTs: Date.now(),
      headers: headersToRecord(requestHeaders),
      bodySize,
      origin,
      service,
    });

    logger.debug(`Request options for ${fullUrl}:`, method, headers, options.body);

    const response = await fetch(fullUrl, options);
    const durationMs = Math.round(now() - startPerf);

    logger.debug(`Response ok: ${response.ok} status: ${response.status} for ${fullUrl}:`);

    if (!response.ok) {
      let errorData: any;
      let loggedErrorData = false;
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
        errorData = { error: `HTTP ${response.status}: ${response.statusText}`, statusCode: response.status };
      }

      if (errorData && !loggedErrorData) logger.error('API error response:', errorData);

      const apiError = createErrorFromAPIResponse(response.status, errorData, { url, method, headers });

      // 🔹 notify error
      _notify.error({
        requestId,
        url: fullUrl,
        path,
        durationMs,
        error: apiError ?? new Error(`HTTP ${response.status}`),
        status: response.status,
        origin,
        service,
      });

      return { success: false, error: apiError.message, statusCode: response.status, errorDetails: apiError };
    }

    let data: any;
    try {
      data = await response.json();
    } catch (jsonError) {
      const netErr = new NetworkError('Invalid JSON response from server', jsonError as Error, {
        url,
        method,
        status: response.status,
      });
      logger.error('Failed to parse successful response as JSON:', {
        url,
        method,
        status: response.status,
        parseError: jsonError,
      });

      // 🔹 notify error (JSON parse)
      _notify.error({
        requestId,
        url: fullUrl,
        path,
        durationMs,
        error: netErr,
        status: response.status,
        origin,
        service,
      });

      throw netErr;
    }

    // 🔹 success notify
    _notify.response({
      requestId,
      url: fullUrl,
      path,
      status: response.status,
      durationMs,
      headers: headersToRecord(response.headers),
      origin,
      service,
    });

    return { success: true, data, headers: response.headers };
  } catch (error: any) {
    const durationMs = Math.round(now() - startPerf);

    if (error?.name === 'AbortError') {
      logger.error('Network request timed out:', { url, method, timeout });

      // 🔹 timeout notify
      const baseUrl = fromEnclave ? getUrl('EASE_RELAY') : getUrl('EASE_API');
      const fullUrl = isAbsoluteUrl ? url : `${baseUrl}${url.startsWith('/') ? url.substring(1) : url}`;
      const origin: 'internal' | 'external' = isAbsoluteUrl && !fullUrl.includes(baseUrl) ? 'external' : 'internal';
      const service = serviceFrom(fullUrl, fromEnclave, isAbsoluteUrl);
      const path = toPath(fullUrl);

      _notify.error({
        requestId,
        url: fullUrl,
        path,
        durationMs,
        error: new NetworkError('Request timed out', error, { url, method }),
        origin,
        service,
      });

      return {
        success: false,
        error: 'Request timed out',
        errorDetails: new NetworkError('Request timed out', error, { url, method }),
      };
    }

    logger.error('Network request failed:', { url, method, error: error?.message, cause: error?.cause });

    const networkError = handleUnknownError(error, { url, method });

    // 🔹 generic error notify
    const baseUrl = fromEnclave ? getUrl('EASE_RELAY') : getUrl('EASE_API');
    const fullUrl = isAbsoluteUrl ? url : `${baseUrl}${url.startsWith('/') ? url.substring(1) : url}`;
    const origin: 'internal' | 'external' = isAbsoluteUrl && !fullUrl.includes(baseUrl) ? 'external' : 'internal';
    const service = serviceFrom(fullUrl, fromEnclave, isAbsoluteUrl);
    const path = toPath(fullUrl);

    _notify.error({
      requestId,
      url: fullUrl,
      path,
      durationMs,
      error: networkError,
      origin,
      service,
    });

    return { success: false, error: networkError.message, errorDetails: networkError };
  } finally {
    clearTimeout(timeoutId);
  }
}
