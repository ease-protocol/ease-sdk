import { SDK_VERSION } from '../version';
import { getEnvironment } from './environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LoggerConfig {
  level?: LogLevel;
  prefix?: string;
  packageVersion?: string;
}

class Logger {
  private config: LoggerConfig = {
    level: LogLevel.DEBUG,
    packageVersion: SDK_VERSION,
  };

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private formatMessage(level: LogLevel, message: string): string {
    const levelTag = `[${LogLevel[level]}]`;
    const envTag = getEnvironment() ? `[${getEnvironment()}]` : '';
    const prefix = this.config.prefix || `[ease-sdk@${this.config.packageVersion || SDK_VERSION}]`;
    return `${prefix}${envTag} ${levelTag} ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.config.level! <= LogLevel.DEBUG) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.config.level! <= LogLevel.INFO) {
      console.info(this.formatMessage(LogLevel.INFO, message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.config.level! <= LogLevel.WARN) {
      console.warn(this.formatMessage(LogLevel.WARN, message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.config.level! <= LogLevel.ERROR) {
      console.error(this.formatMessage(LogLevel.ERROR, message), ...args);
    }
  }
}

export const logger = new Logger();
