import { LogLevel } from './utils/logger';
import { Environment } from './utils/type';
export interface SDKConfig {
  appName?: string;
  environment?: Environment;
  logLevel?: LogLevel;
}
export declare function configure(sdkConfig: SDKConfig): void;
export declare function setAppName(name: string): void;
export declare function getAppName(): string;
