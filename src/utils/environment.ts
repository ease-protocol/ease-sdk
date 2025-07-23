import { logger } from './logger';
import { Environment } from './type';

const VALID_ENVIRONMENTS: Set<Environment> = new Set(['develop', 'staging', 'production']);
let currentEnvironment: Environment = 'develop';

export const setEnvironment = (environment: Environment) => {
  if (!VALID_ENVIRONMENTS.has(environment)) {
    throw new Error('Invalid environment. Please use "develop", "staging", or "production".');
  }

  currentEnvironment = environment;
  logger.info(`Environment set to: ${currentEnvironment}`);
};

export const getEnvironment = (): Environment => {
  return currentEnvironment;
};
