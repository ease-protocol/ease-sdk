import { getEnvironment } from './environment';
import { Environment } from './type';

type ServiceUrls = {
  EASE_API: string;
  EASE_RELAY: string;
  MEMPOOL_SPACE: string;
  ETHERSCAN_PROXY: string;
  SEPOLIA_ETHERSCAN: string;
};

const urls: Record<Environment, ServiceUrls> = {
  develop: {
    EASE_API: 'https://api.ease.tech',
    EASE_RELAY: 'https://relay.ease.tech',
    MEMPOOL_SPACE: 'https://mempool.space/testnet',
    ETHERSCAN_PROXY: 'https://etherscan-proxy-am1u.vercel.app',
    SEPOLIA_ETHERSCAN: 'https://sepolia.etherscan.io',
  },
  staging: {
    EASE_API: 'https://api.ease.tech',
    EASE_RELAY: 'https://relay.ease.tech',
    MEMPOOL_SPACE: 'https://mempool.space/testnet',
    ETHERSCAN_PROXY: 'https://etherscan-proxy-am1u.vercel.app',
    SEPOLIA_ETHERSCAN: 'https://sepolia.etherscan.io',
  },
  production: {
    EASE_API: 'https://api.ease.tech',
    EASE_RELAY: 'https://relay.ease.tech',
    MEMPOOL_SPACE: 'https://mempool.space',
    ETHERSCAN_PROXY: 'https://etherscan-proxy-am1u.vercel.app',
    SEPOLIA_ETHERSCAN: 'https://etherscan.io',
  },
};

export const getUrl = (service: keyof typeof urls.develop) => {
  const environment = getEnvironment() as Environment;
  return urls[environment][service];
};
