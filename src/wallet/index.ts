import { EaseSDKError, ErrorCode, handleUnknownError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Transaction } from '../utils/type'; // Assuming Transaction type is already defined in type.ts
import { internalApi } from '../api';
import { fetchExternalBlockchainData } from '../api/externalApi';



export function truncateAddress(address: string): string {
  if (typeof address !== 'string') {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Address must be a string.' });
  }
  if (address.length === 0) return '';
  if (address.length <= 20) return address;
  return address.slice(0, 6) + '...' + address.slice(-6);
}

export function getWalletInfo(coin: string): { name: string; accent: string } {
  if (typeof coin !== 'string' || coin.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Coin must be a non-empty string.' });
  }
  switch (coin.toUpperCase()) {
    case 'EASE':
      return { name: 'EASE', accent: '#1b1818' };
    case 'BTC':
      return { name: 'Bitcoin', accent: '#f7931a' };
    case 'ETH':
      return { name: 'Ethereum', accent: '#000000' };
    default:
      return { name: coin, accent: '#1b1818' };
  }
}

export function ammountToSmallestUnit(coin: string, amount: number): number {
  if (typeof coin !== 'string' || coin.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Coin must be a non-empty string.' });
  }
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Amount must be a number.' });
  }
  switch (coin.toUpperCase()) {
    case 'EASE':
      // 1 EOS = 10,000 (4 decimal places)
      return amount * 1e4;

    case 'BTC':
      // 1 BTC = 100,000,000 sats
      return amount * 1e8;

    case 'ETH':
      // 1 ETH = 1,000,000,000,000,000,000 wei
      return amount * 1e18;

    default:
      throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: `Unsupported coin type: ${coin}` });
  }
}

export function explorerUrlFromResponse(coin: string, response: any): string {
  if (typeof coin !== 'string' || coin.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Coin must be a non-empty string.' });
  }
  switch (coin.toUpperCase()) {
    case 'EASE':
      return '';
    case 'BTC':
      return `https://mempool.space/testnet/tx/${response}`;
    case 'ETH':
      return `https://sepolia.etherscan.io/tx/${response}`;
    default:
      return '';
  }
}

export async function getWalletBalance(coin: string, address: string): Promise<string> {
  if (typeof coin !== 'string' || coin.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Coin must be a non-empty string.' });
  }
  if (typeof address !== 'string' || address.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Address must be a non-empty string.' });
  }

  try {
    logger.debug(`Attempting to get wallet balance for coin: ${coin}, address: ${address}`);
    let data: any;

    switch (coin.toUpperCase()) {
      case 'EASE': {
        const balance = await fetchExternalBlockchainData<string>('EASE', address, 'balance');
        logger.info(`Successfully retrieved EASE balance for address: ${address}. Balance: ${balance}`);
        return balance;
      }

      case 'BTC': {
        const balance = await fetchExternalBlockchainData<string>('BTC', address, 'balance');
        logger.info(`Successfully retrieved BTC balance for address: ${address}. Balance: ${balance}`);
        return balance;
      }

      case 'ETH': {
        const balance = await fetchExternalBlockchainData<string>('ETH', address, 'balance');
        logger.info(`Successfully retrieved ETH balance for address: ${address}. Balance: ${balance}`);
        return balance;
      }

      default:
        throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: `Unsupported coin: ${coin}` });
    }
  } catch (error: unknown) {
    throw handleUnknownError(error, { coin, address, operation: 'getWalletBalance' });
  }
}

export async function getWalletHistory(coin: string, address: string): Promise<Transaction[]> {
  if (typeof coin !== 'string' || coin.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Coin must be a non-empty string.' });
  }
  if (typeof address !== 'string' || address.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Address must be a non-empty string.' });
  }

  try {
    logger.debug(`Attempting to get wallet history for coin: ${coin}, address: ${address}`);
    let data: any;

    switch (coin.toUpperCase()) {
      case 'EASE': {
        const res = await internalApi(`/v2/history/get_actions`, 'GET', { account: address, limit: 20 }, undefined, true);
        if (!res.success || !res.data) {
          logger.error(
            `EASE history request failed for address: ${address}. Error: ${res.error || 'Unknown error'}`,
            res.errorDetails,
          );
          throw (
            res.errorDetails ||
            new EaseSDKError({ code: ErrorCode.API_ERROR, message: `EASE history request failed: ${res.error}` })
          );
        }
        data = res.data;

        if (!data || !Array.isArray(data.actions)) {
          logger.warn(`EASE history API returned invalid data structure or empty actions for address: ${address}.`, {
            data,
          });
          return [];
        }
        logger.info(
          `Successfully retrieved EASE history for address: ${address}. Found ${data.actions.length} actions.`,
        );
        return data.actions
          .filter((a: any) => a.act?.account === 'eosio.token' && a.act?.name === 'transfer')
          .map((action: any) => {
            const { to, quantity } = action.act.data;
            const type = to === address ? 'in' : 'out';
            return {
              id: action.trx_id,
              type,
              amount: quantity.split(' ')[0],
              explorerURL: '',
            };
          });
      }

      case 'BTC': {
        const txs = await fetchExternalBlockchainData<Transaction[]>('BTC', address, 'history');
        logger.info(`Successfully retrieved BTC history for address: ${address}. Found ${txs.length} transactions.`);
        return txs;
      }

      case 'ETH': {
        const txs = await fetchExternalBlockchainData<Transaction[]>('ETH', address, 'history');
        logger.info(`Successfully retrieved ETH history for address: ${address}. Found ${txs.length} transactions.`);
        return txs;
      }

      default:
        throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: `Unsupported coin: ${coin}` });
    }
  } catch (error: unknown) {
    throw handleUnknownError(error, { coin, address, operation: 'getWalletHistory' });
  }
}
