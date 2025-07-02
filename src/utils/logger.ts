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
}

class Logger {
  private config: LoggerConfig = {
    level: LogLevel.WARN,
    prefix: '[ease-sdk]',
  };

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
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
    }
  }
}

export const logger = new Logger();
