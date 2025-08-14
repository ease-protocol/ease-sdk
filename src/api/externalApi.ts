import { getUrl } from '../utils/urls';
import { internalApi, ApiResponse } from './index';
import { EaseSDKError, ErrorCode, handleUnknownError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Transaction } from '../utils/type';

export async function fetchExternalBlockchainData<T>(
  coin: string,
  address: string,
  action: 'balance' | 'history',
): Promise<T> {
  try {
    logger.debug(`Fetching external blockchain data for ${coin}, address: ${address}, action: ${action}`);
    let url: string;
    let method: 'GET' | 'POST' = 'GET';
    let body: any = null;
    let response: ApiResponse<any>;

    switch (coin.toUpperCase()) {
      case 'EASE':
        if (action === 'balance') {
          url = `${getUrl('EASE_CHAIN_API')}/v1/chain/get_currency_balance`;
          method = 'POST';
          body = {
            account: address,
            code: 'eosio.token',
            symbol: 'EASE',
          };
          response = await internalApi(url, method, body, undefined, false, true);
          if (!response.success || !Array.isArray(response.data) || response.data.length === 0) {
            logger.warn(`EASE balance API returned empty or non-array result for address: ${address}.`, {
              data: response.data,
            });
            return '0' as T;
          }
          const balance = response.data[0].split(' ')[0];

          return balance as T;
        } else if (action === 'history') {
          url = `${getUrl('EASE_CHAIN_API')}/v2/history/get_actions`;
          response = await internalApi(url, method, body, undefined, false, true);

          if (!response.success || !Array.isArray(response.data.actions)) {
            logger.warn(`EASE history API returned invalid data structure for address: ${address}.`, {
              data: response.data,
            });
            return [] as T;
          }

          return response.data.actions
            .filter(
              (a: any) =>
                a.act?.account === 'eosio.token' && a.act?.name === 'transfer' && a.act?.data?.symbol === 'EASE',
            )
            .map((action: any) => {
              const { to, quantity } = action.act.data;
              const type = to === address ? 'in' : 'out';
              return {
                id: action.trx_id,
                type,
                amount: quantity.split(' ')[0],
                explorerURL: '',
              } satisfies Transaction;
            });
        }
        break;
      case 'BTC':
        if (action === 'balance') {
          url = `${getUrl('MEMPOOL_SPACE')}/api/address/${address}`;
          response = await internalApi(url, method, body, undefined, false, true);
          if (!response.success || !response.data || typeof response.data.chain_stats !== 'object') {
            logger.warn(`BTC balance API returned invalid data structure for address: ${address}.`, {
              data: response.data,
            });
            return '0' as T;
          }
          const sats = response.data.chain_stats.funded_txo_sum - response.data.chain_stats.spent_txo_sum;
          return (sats / 1e8).toFixed(8) as T;
        } else if (action === 'history') {
          url = `${getUrl('MEMPOOL_SPACE')}/api/address/${address}/txs`;
          response = await internalApi(url, method, body, undefined, false, true);
          if (!response.success || !Array.isArray(response.data)) {
            logger.warn(`BTC history API returned invalid data structure for address: ${address}.`, {
              data: response.data,
            });
            return [] as T;
          }
          return response.data.map((tx: any) => {
            const isIncoming = tx.vout.some((v: any) => v.scriptpubkey_address === address);
            const amountSats = isIncoming
              ? tx.vout.find((v: any) => v.scriptpubkey_address === address)?.value || 0
              : tx.vin.find((v: any) => v.prevout?.scriptpubkey_address === address)?.prevout?.value || 0;

            return {
              id: tx.txid,
              type: isIncoming ? 'in' : 'out',
              amount: (amountSats / 1e8).toFixed(8),
              explorerURL: `${getUrl('MEMPOOL_SPACE')}/tx/${tx.txid}`,
            };
          }) as T;
        }
        break;

      case 'ETH':
        if (action === 'balance') {
          url = `${getUrl('ETHERSCAN_PROXY')}/api/balance?address=${address}`;
          response = await internalApi(url, method, body, undefined, false, true);
          logger.debug(`ETH balance API response for address ${coin}:`, JSON.stringify(response));
          if (!response.success || typeof response.data?.result === 'undefined') {
            logger.warn(`ETH balance API returned invalid data structure for address: ${address}.`, {
              data: response.data,
            });
            return '0' as T;
          }
          return (Number(response.data.result) / 1e18).toFixed(8) as T;
        } else if (action === 'history') {
          url = `${getUrl('ETHERSCAN_PROXY')}/api/history?address=${address}`;
          response = await internalApi(url, method, body, undefined, false, true);
          if (!response.success || !Array.isArray(response.data?.result)) {
            logger.warn(`Etherscan API returned non-array result for transaction history for address: ${address}.`, {
              data: response.data,
            });
            return [] as T;
          }
          return response.data.result.map((tx: any) => {
            const type = tx.to?.toLowerCase() === address.toLowerCase() ? 'in' : 'out';
            return {
              id: tx.hash,
              type,
              amount: (Number(tx.value) / 1e18).toFixed(8),
              explorerURL: `${getUrl('SEPOLIA_ETHERSCAN')}/tx/${tx.hash}`,
            };
          }) as T;
        }
        break;

      default:
        throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: `Unsupported coin: ${coin}` });
    }
    throw new EaseSDKError({
      code: ErrorCode.INVALID_INPUT,
      message: `Unsupported action for coin ${coin}: ${action}`,
    });
  } catch (error: unknown) {
    throw handleUnknownError(error, { coin, address, action, operation: 'fetchExternalBlockchainData' });
  }
}
