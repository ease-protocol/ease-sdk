import { getUrl } from '../utils/urls';
import { EaseSDKError, ErrorCode, handleUnknownError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Transaction } from '../utils/type'; // Assuming Transaction type is already defined in type.ts
import { fetchExternalBlockchainData } from '../api/externalApi';

/**
 * Truncates a given blockchain address for display purposes.
 * If the address is longer than 20 characters, it truncates the middle part,
 * showing the first 6 and last 6 characters separated by '...'.
 *
 * @param {string} address The blockchain address to truncate.
 * @returns {string} The truncated or original address.
 * @throws {EaseSDKError} If the input address is not a string.
 */
export function truncateAddress(address: string): string {
  if (typeof address !== 'string') {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Address must be a string.' });
  }
  if (address.length === 0) return '';
  if (address.length <= 20) return address;
  return address.slice(0, 6) + '...' + address.slice(-6);
}

/**
 * Returns display information for a given cryptocurrency coin.
 *
 * @param {string} coin The ticker symbol of the cryptocurrency (e.g., 'EASE', 'BTC', 'ETH').
 * @returns {{ name: string; accent: string }} An object containing the full name and accent color for the coin.
 * @throws {EaseSDKError} If the input coin is not a non-empty string.
 */
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

/**
 * Converts a given amount of cryptocurrency to its smallest unit (e.g., BTC to satoshis, ETH to wei).
 *
 * @param {string} coin The ticker symbol of the cryptocurrency (e.g., 'EASE', 'BTC', 'ETH').
 * @param {number} amount The amount to convert.
 * @returns {number} The converted amount in the smallest unit.
 * @throws {EaseSDKError} If the input coin or amount are invalid, or if the coin type is unsupported.
 */
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

/**
 * Generates an explorer URL for a given transaction response based on the coin type.
 *
 * @param {string} coin The ticker symbol of the cryptocurrency (e.g., 'BTC', 'ETH').
 * @param {string} trxId The transaction response object or ID from which to construct the URL.
 * @returns {string} The URL to the transaction on the respective blockchain explorer, or an empty string if not supported.
 * @throws {EaseSDKError} If the input coin is not a non-empty string.
 */
export function explorerUrlFromResponse(coin: string, trxId: string): string {
  if (typeof coin !== 'string' || coin.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Coin must be a non-empty string.' });
  }
  switch (coin.toUpperCase()) {
    case 'EASE':
      return '';
    case 'BTC':
      return `${getUrl('MEMPOOL_SPACE')}/tx/${trxId}`;
    case 'ETH':
      return `${getUrl('SEPOLIA_ETHERSCAN')}/tx/${trxId}`;
    default:
      return '';
  }
}

/**
 * Retrieves the wallet balance for a specific cryptocurrency and address.
 *
 * @param {string} coin The ticker symbol of the cryptocurrency (e.g., 'EASE', 'BTC', 'ETH').
 * @param {string} address The wallet address.
 * @returns {Promise<string>} A promise that resolves with the wallet balance as a string.
 * @throws {EaseSDKError} If the input coin or address are invalid, or if the coin type is unsupported.
 */
export async function getWalletBalance(coin: string, address: string): Promise<string> {
  if (typeof coin !== 'string' || coin.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Coin must be a non-empty string.' });
  }
  if (typeof address !== 'string' || address.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Address must be a non-empty string.' });
  }

  try {
    logger.debug(`Attempting to get wallet balance for coin: ${coin}, address: ${address}`);

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
    const enhancedError = handleUnknownError(error, { coin, address, operation: 'getWalletBalance' });
    throw enhancedError;
  }
}

/**
 * Retrieves the transaction history for a specific cryptocurrency and address.
 *
 * @param {string} coin The ticker symbol of the cryptocurrency (e.g., 'EASE', 'BTC', 'ETH').
 * @param {string} address The wallet address.
 * @returns {Promise<Transaction[]>} A promise that resolves with an array of transaction objects.
 * @throws {EaseSDKError} If the input coin or address are invalid, or if the coin type is unsupported.
 */
export async function getWalletHistory(coin: string, address: string): Promise<Transaction[]> {
  if (typeof coin !== 'string' || coin.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Coin must be a non-empty string.' });
  }
  if (typeof address !== 'string' || address.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Address must be a non-empty string.' });
  }

  try {
    logger.debug(`Attempting to get wallet history for coin: ${coin}, address: ${address}`);

    switch (coin.toUpperCase()) {
      case 'EASE': {
        const txs = await fetchExternalBlockchainData<Transaction[]>(coin, address, 'history');
        logger.info(`Successfully retrieved EASE history for address: ${address}. Found ${txs.length} transactions.`);
        return txs;
      }

      case 'BTC': {
        const txs = await fetchExternalBlockchainData<Transaction[]>(coin, address, 'history');
        logger.info(`Successfully retrieved BTC history for address: ${address}. Found ${txs.length} transactions.`);
        return txs;
      }

      case 'ETH': {
        const txs = await fetchExternalBlockchainData<Transaction[]>(coin, address, 'history');
        logger.info(`Successfully retrieved ETH history for address: ${address}. Found ${txs.length} transactions.`);

        return txs;
      }

      default:
        throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: `Unsupported coin: ${coin}` });
    }
  } catch (error: unknown) {
    const enhancedError = handleUnknownError(error, { coin, address, operation: 'getWalletHistory' });

    throw enhancedError;
  }
}
