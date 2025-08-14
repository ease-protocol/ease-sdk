import { SDK_VERSION } from './version';
import { setEnvironment } from './utils/environment';
import { logger, LogLevel } from './utils/logger';
import { Environment } from './utils/type';

const config = {
  appName: `EASE_SDK_DEFAULT_APP_V${SDK_VERSION}`,
};

export interface SDKConfig {
  appName?: string;
  environment?: Environment;
  logLevel?: LogLevel;
}

export function configure(sdkConfig: SDKConfig) {
  if (sdkConfig.appName) {
    setAppName(sdkConfig.appName);
  }
  if (sdkConfig.environment) {
    setEnvironment(sdkConfig.environment);
  }
  if (sdkConfig.logLevel !== undefined) {
    logger.configure({ level: sdkConfig.logLevel });
  }
}

export function setAppName(name: string) {
  config.appName = name;
}

export function getAppName(): string {
  return config.appName;
}
