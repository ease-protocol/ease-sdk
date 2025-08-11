import { SDK_VERSION } from './version';

const config = {
  appName: `EASE_SDK_DEFAULT_APP_V${SDK_VERSION}`,
};

export function setAppName(name: string) {
  config.appName = name;
}

export function getAppName(): string {
  return config.appName;
}
