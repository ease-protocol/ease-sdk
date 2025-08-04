import { getEnvironment } from './environment';
import { getUrl } from './urls';

const { version } = require('../../package.json');
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LoggerConfig {
  level: LogLevel;
  prefix: string;
  packageVersion?: string;
}

class Logger {
  private config: LoggerConfig = {
    level: LogLevel.DEBUG,
    prefix: `[ease-sdk@${version}]`,
  };

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.config.packageVersion) {
      this.config.prefix = `[ease-sdk@${this.config.packageVersion}]`;
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.debug(`${this.config.prefix} [DEBUG]`, message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.INFO) {
      console.info(`${this.config.prefix} [INFO]`, message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.WARN) {
      console.warn(`${this.config.prefix} [WARN]`, message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      console.error(`${this.config.prefix} [ERROR]`, message, ...args);
      this.logEvent(message, 'error', { args });
    }
  }
  async logEvent(
    message: string,
    level: 'info' | 'warn' | 'error' | 'debug' = 'info',
    context: Record<string, any> = {},
    deviceId?: string,
  ) {
    try {
      const url = getUrl('API_LOGGING');
      const environment = getEnvironment();
      const timestamp = new Date().toISOString();

      const body = {
        message,
        level,
        context,
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
        this.error('Failed to log event', { status: response.status });
      }
    } catch (error) {
      this.error('Error in logEvent', error);
    }
  }

  async logEvents(
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
        this.error('Failed to log events', { status: response.status });
      }
    } catch (error) {
      this.error('Error in logEvents', error);
    }
  }
}

export const logger = new Logger();
