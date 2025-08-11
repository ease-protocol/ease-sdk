// api.ts
import { getUrl } from '../utils/urls';
import { logger } from '../utils/logger';
import { NetworkError, createErrorFromAPIResponse, handleUnknownError } from '../utils/errors';
import type { EaseSDKError } from '../utils/errors';
import { getAppName } from '../config';
import { _notify } from '../core/telemetry';
import { randomUUID } from '../core/randomId';

// ⬇️ if your SDK exposes logEvents in a different path, adjust this import
import { logEvents } from '../analytics';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  errorDetails?: EaseSDKError;
  headers?: Headers;
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/* -------------------------- helpers & utilities -------------------------- */

const now = () => {
  try {
    return globalThis.performance?.now() ?? Date.now();
  } catch {
    return Date.now();
  }
};

const redactHeader = (k: string, v: string) => (/authorization|token|cookie|set-cookie/i.test(k) ? 'REDACTED' : v);

function headersToRecord(h: Headers | Record<string, string> | undefined): Record<string, string> | undefined {
  try {
    if (!h) return undefined;
    if (h instanceof Headers) {
      return Object.fromEntries([...h.entries()].map(([k, v]) => [k, redactHeader(k, v)]));
    }
    return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, redactHeader(k, v)]));
  } catch {
    return undefined;
  }
}

const toPath = (u: string): string | undefined => {
  try {
    return new URL(u).pathname;
  } catch {
    return undefined;
  }
};

const joinBaseAndPath = (base: string, path: string) => `${base}${path}`;

const serviceFrom = (fullUrl: string, fromEnclave: boolean, isAbsoluteUrl: boolean): string => {
  if (!isAbsoluteUrl) return fromEnclave ? 'EASE_RELAY' : 'EASE_API';
  if (fullUrl.includes('mempool.space')) return 'MEMPOOL_SPACE';
  if (fullUrl.includes('etherscan')) return 'ETHERSCAN_PROXY';

  return 'EXTERNAL';
};

function resolveRequestMeta(rawUrl: string, fromEnclave: boolean, isAbsoluteUrl: boolean) {
  const baseUrl = fromEnclave ? getUrl('EASE_RELAY') : getUrl('EASE_API');
  const fullUrl = isAbsoluteUrl ? rawUrl : joinBaseAndPath(baseUrl, rawUrl);
  const origin: 'internal' | 'external' = isAbsoluteUrl && !fullUrl.includes(baseUrl) ? 'external' : 'internal';
  const service = serviceFrom(fullUrl, fromEnclave, isAbsoluteUrl);
  const path = toPath(fullUrl);
  return { baseUrl, fullUrl, origin, service, path };
}

// Avoid infinite loops if your analytics endpoint itself uses this transport
const ANALYTICS_HINTS = ['/analytics', '/events', '/logs'];
const shouldSkipAnalyticsEvent = (url: string) => ANALYTICS_HINTS.some((h) => url.includes(h));

async function emitLogEvent(kind: 'request' | 'response' | 'error', payload: Record<string, unknown>) {
  try {
    const url = String(payload.url ?? '');
    if (shouldSkipAnalyticsEvent(url)) return; // recursion guard
    await logEvents([{ message: `transport.${kind}`, context: payload }]);
  } catch {
    // never throw from telemetry
  }
}

function makeRequestInit(
  method: HttpMethod,
  headers: Record<string, string> | undefined,
  body: unknown,
  signal: AbortSignal,
) {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const init: RequestInit = { method, headers: requestHeaders, signal };

  let bodySize: number | undefined;
  if (body !== null && body !== undefined && method !== 'GET' && method !== 'HEAD') {
    const bodyString = JSON.stringify(body);
    init.body = bodyString;
    try {
      bodySize =
        typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(bodyString).byteLength : bodyString.length;
    } catch {
      bodySize = bodyString.length;
    }
  }
  return { init, requestHeaders, bodySize };
}

/* ------------------------------ main request ----------------------------- */

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

  const requestId = randomUUID();
  const startPerf = now();

  // Resolve all URL/service metadata once (reused in all paths)
  const { fullUrl, origin, service, path } = resolveRequestMeta(url, fromEnclave, isAbsoluteUrl);

  try {
    const { init, requestHeaders, bodySize } = makeRequestInit(method, headers, body, controller.signal);

    // Add correlation header only for internal services
    if (origin === 'internal') {
      requestHeaders['x-client-request-id'] = requestId;
    }
    const appName = getAppName();
    // REQUEST: notify + log
    const requestCtx = {
      appName,
      requestId,
      method,
      url: fullUrl,
      path,
      startTs: Date.now(),
      headers: headersToRecord(requestHeaders),
      bodySize,
      origin,
      service,
      timeoutMs: timeout,
    };
    _notify.request(requestCtx);
    logger.debug('Request', requestCtx);
    emitLogEvent('request', requestCtx); // fire-and-forget

    // Fetch
    const response = await fetch(fullUrl, init);
    const durationMs = Math.round(now() - startPerf);

    logger.debug(`Response ok: ${response.ok} status: ${response.status} for ${fullUrl}`);

    // Non-OK → treat as error
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch (jsonError) {
        errorData = {
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          parseError: String(jsonError),
        };
      }

      const apiError = createErrorFromAPIResponse(response.status, errorData, {
        url,
        method,
        headers,
      });

      // ERROR: notify + log
      const errorCtx = {
        requestId,
        url: fullUrl,
        path,
        status: response.status,
        durationMs,
        origin,
        service,
        error: {
          name: apiError?.name ?? 'HttpError',
          message: apiError?.message ?? `HTTP ${response.status}`,
          details: errorData,
        },
        responseHeaders: headersToRecord(response.headers),
      };
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
      logger.error('Response error', errorCtx);
      emitLogEvent('error', errorCtx);

      return {
        success: false,
        error: apiError.message,
        statusCode: response.status,
        errorDetails: apiError,
      };
    }

    // Try to parse JSON
    let data: any;
    try {
      data = await response.json();
    } catch (jsonError) {
      const netErr = new NetworkError('Invalid JSON response from server', jsonError as Error, {
        url,
        method,
        status: response.status,
      });

      const errorCtx = {
        requestId,
        url: fullUrl,
        path,
        status: response.status,
        durationMs,
        origin,
        service,
        error: { name: netErr.name, message: netErr.message },
        responseHeaders: headersToRecord(response.headers),
      };
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
      logger.error('JSON parse error', errorCtx);
      emitLogEvent('error', errorCtx);

      throw netErr;
    }

    // RESPONSE (success): notify + log summary (no body)
    const responseCtx = {
      requestId,
      url: fullUrl,
      path,
      status: response.status,
      durationMs,
      origin,
      service,
      responseHeaders: headersToRecord(response.headers),
    };
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
    logger.info('Response', responseCtx);
    emitLogEvent('response', responseCtx);

    return { success: true, data, headers: response.headers };
  } catch (error: any) {
    const durationMs = Math.round(now() - startPerf);

    // Timeout
    if (error?.name === 'AbortError') {
      const timeoutErr = new NetworkError('Request timed out', error, { url, method });

      const errorCtx = {
        requestId,
        url: fullUrl,
        path,
        durationMs,
        origin,
        service,
        error: { name: timeoutErr.name, message: timeoutErr.message },
        timeoutMs: timeout,
      };
      _notify.error({
        requestId,
        url: fullUrl,
        path,
        durationMs,
        error: timeoutErr,
        origin,
        service,
      });
      logger.error('Timeout error', errorCtx);
      emitLogEvent('error', errorCtx);

      return {
        success: false,
        error: 'Request timed out',
        errorDetails: timeoutErr,
      };
    }

    // Generic network/unknown error
    const networkError = handleUnknownError(error, { url, method });

    const errorCtx = {
      requestId,
      url: fullUrl,
      path,
      durationMs,
      origin,
      service,
      error: { name: networkError.name, message: networkError.message },
    };
    _notify.error({
      requestId,
      url: fullUrl,
      path,
      durationMs,
      error: networkError,
      origin,
      service,
    });
    logger.error('Network error', errorCtx);
    emitLogEvent('error', errorCtx);

    return {
      success: false,
      error: networkError.message,
      errorDetails: networkError,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
