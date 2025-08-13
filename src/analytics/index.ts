import { getEnvironment } from '../utils/environment';
import { getUrl } from '../utils/urls';
import { logger } from '../utils/logger';
import { getAppName } from '../config';

export interface LogEventBody {
  id?: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  context: Record<string, any>;
  environment: string;
  deviceId?: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

async function sendLogRequest(
  url: string,
  body: LogEventBody | LogEventBody[],
  failedLogMessage: string,
  errorLogMessage: string,
) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      logger.error(failedLogMessage, { status: response.status });
    }
  } catch (error) {
    logger.error(errorLogMessage, error);
  }
}

export async function logEvent(
  message: string,
  level: 'info' | 'warn' | 'error' | 'debug' = 'info',
  context: Record<string, any> = {},
  deviceId?: string,
  ipAddress?: string,
  userAgent?: string,
) {
  try {
    const url = getUrl('API_LOGGING');
    const environment = getEnvironment();
    const timestamp = new Date().toISOString();
    const appName = getAppName();

    const body: LogEventBody = {
      message,
      level,
      context: { ...context, appName },
      environment,
      deviceId,
      timestamp,
      ...(ipAddress && { ip_address: ipAddress }),
      ...(userAgent && { user_agent: userAgent }),
    };

    await sendLogRequest(url, body, 'Failed to log event', 'Error in logEvent');
  } catch (error) {
    logger.error('Error in logEvent', error);
  }
}

export async function logEvents(
  events: {
    message: string;
    level?: 'info' | 'warn' | 'error' | 'debug';
    context?: Record<string, any>;
    deviceId?: string;
    ip_address?: string;
    user_agent?: string;
  }[],
) {
  try {
    const url = getUrl('API_LOGGING');
    const environment = getEnvironment();
    const timestamp = new Date().toISOString();

    const body: LogEventBody[] = events.map((event) => ({
      ...event,
      level: event.level ?? 'info',
      environment,
      timestamp,
      context: event.context ?? {}, // Ensure context is always defined
    }));

    await sendLogRequest(url, body, 'Failed to log events', 'Error in logEvents');
  } catch (error) {
    logger.error('Error in logEvents', error);
  }
}
