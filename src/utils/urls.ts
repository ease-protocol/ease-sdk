import { getEnvironment } from './environment';
import { Environment } from './type';

type ServiceUrls = {
  EASE_API: string;
  EASE_RELAY: string;
  MEMPOOL_SPACE: string;
  ETHERSCAN_PROXY: string;
  SEPOLIA_ETHERSCAN: string;
  API_LOGGING: string;
};

const urls: Record<Environment, ServiceUrls> = {
  develop: {
    EASE_API: 'https://staging.api.ease.tech',
    EASE_RELAY: 'https://relay.ease.tech',
    MEMPOOL_SPACE: 'https://mempool.space/testnet',
    ETHERSCAN_PROXY: 'https://etherscan-proxy-am1u.vercel.app',
    SEPOLIA_ETHERSCAN: 'https://sepolia.etherscan.io',
    API_LOGGING: 'https://app-logging.vercel.app/api/logs',
  },
  staging: {
    EASE_API: 'https://staging.api.ease.tech',
    EASE_RELAY: 'https://relay.ease.tech',
    MEMPOOL_SPACE: 'https://mempool.space/testnet',
    ETHERSCAN_PROXY: 'https://etherscan-proxy-am1u.vercel.app',
    SEPOLIA_ETHERSCAN: 'https://sepolia.etherscan.io',
    API_LOGGING: 'https://app-logging.vercel.app/api/logs',
  },
  production: {
    EASE_API: 'https://api.ease.tech',
    EASE_RELAY: 'https://relay.ease.tech',
    MEMPOOL_SPACE: 'https://mempool.space',
    ETHERSCAN_PROXY: 'https://etherscan-proxy-am1u.vercel.app',
    SEPOLIA_ETHERSCAN: 'https://etherscan.io',
    API_LOGGING: 'https://app-logging.vercel.app/api/logs',
  },
};

export const getUrl = (service: keyof typeof urls.develop) => {
  const environment = getEnvironment() as Environment;
  return urls[environment][service];
};
