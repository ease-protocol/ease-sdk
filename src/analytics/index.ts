import { getEnvironment } from '../utils/environment';
import { getUrl } from '../utils/urls';
import { logger } from '../utils/logger';
import { getAppName } from '../config';

export async function logEvent(
  message: string,
  level: 'info' | 'warn' | 'error' | 'debug' = 'info',
  context: Record<string, any> = {},
  deviceId?: string,
) {
  try {
    const url = getUrl('API_LOGGING');
    const environment = getEnvironment();
    const timestamp = new Date().toISOString();
    const appName = getAppName();

    const body = {
      message,
      level,
      context: { ...context, appName },
      environment,
      deviceId,
      timestamp,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      logger.error('Failed to log event', { status: response.status });
    }
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
  }[],
) {
  try {
    const url = getUrl('API_LOGGING');
    const environment = getEnvironment();
    const timestamp = new Date().toISOString();

    const body = events.map((event) => ({
      ...event,
      environment,
      timestamp,
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      logger.error('Failed to log events', { status: response.status });
    }
  } catch (error) {
    logger.error('Error in logEvents', error);
  }
}
