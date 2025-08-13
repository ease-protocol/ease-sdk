import { logger } from './logger';
import { Environment } from './type';

const VALID_ENVIRONMENTS: Set<Environment> = new Set(['develop', 'staging', 'production']);
const ENVIRONMENT_KEY = '__EASE_SDK_CURRENT_ENVIRONMENT__';

// Ensure the global environment variable is initialized only once
if ((globalThis as any)[ENVIRONMENT_KEY] === undefined) {
  (globalThis as any)[ENVIRONMENT_KEY] = 'develop'; // Default value
}

export const setEnvironment = (environment: Environment) => {
  if (!VALID_ENVIRONMENTS.has(environment)) {
    throw new Error('Invalid environment. Please use "develop", "staging", or "production".');
  }
  (globalThis as any)[ENVIRONMENT_KEY] = environment;
  logger.info(`Environment set to: ${environment}`);
};

export const getEnvironment = (): Environment => {
  return (globalThis as any)[ENVIRONMENT_KEY];
};
