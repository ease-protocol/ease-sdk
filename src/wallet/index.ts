import { EaseSDKError, ErrorCode, handleUnknownError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Transaction } from '../utils/type'; // Assuming Transaction type is already defined in type.ts
import { api } from '../api';

const ETHERSCAN_API_KEY = '82S5SBUBPCKY3PTUX3DP6HDAHTNP1UEJVZ';

export function truncateAddress(address: string): string {
  if (address.length <= 20) return address;
  return address.slice(0, 6) + '...' + address.slice(-6);
}

export function getWalletInfo(coin: string): { name: string; accent: string } {
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
      throw new Error(`Unsupported coin type: ${coin}`);
  }
}

export function explorerUrlFromResponse(coin: string, response: any): string {
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
  try {
    let data: any;

    switch (coin.toUpperCase()) {
      case 'EASE': {
        const res = await api(`https://testnet.ease.tech/v1/chain/get_currency_balance`, 'POST', {
          account: address,
          code: 'eosio.token',
          symbol: 'EASE',
        });
        if (!res.success || !res.data) {
          throw (
            res.errorDetails ||
            new EaseSDKError({ code: ErrorCode.API_ERROR, message: `EASE balance request failed: ${res.error}` })
          );
        }
        data = res.data;
        return data.length ? data[0].split(' ')[0] : '0';
      }

      case 'BTC': {
        const res = await api(`https://mempool.space/testnet/api/address/${address}`, 'GET');
        if (!res.success || !res.data) {
          throw (
            res.errorDetails ||
            new EaseSDKError({ code: ErrorCode.API_ERROR, message: `BTC balance request failed: ${res.error}` })
          );
        }
        data = res.data;
        const sats = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        return (sats / 1e8).toFixed(8); // satoshis to BTC
      }

      case 'ETH': {
        const res = await api(
          `https://api-sepolia.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`,
          'GET',
        );
        if (!res.success || !res.data) {
          throw (
            res.errorDetails ||
            new EaseSDKError({ code: ErrorCode.API_ERROR, message: `ETH balance request failed: ${res.error}` })
          );
        }
        data = res.data;
        return (Number(data.result) / 1e18).toFixed(8); // wei to ETH
      }

      default:
        throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: `Unsupported coin: ${coin}` });
    }
  } catch (error: unknown) {
    throw handleUnknownError(error, { coin, address, operation: 'getWalletBalance' });
  }
}

export async function getWalletHistory(coin: string, address: string): Promise<Transaction[]> {
  try {
    let data: any;

    switch (coin.toUpperCase()) {
      case 'EASE': {
        const res = await api(`https://testnet.ease.tech/v2/history/get_actions?account=${address}&limit=20`, 'GET');
        if (!res.success || !res.data) {
          throw (
            res.errorDetails ||
            new EaseSDKError({ code: ErrorCode.API_ERROR, message: `EASE history request failed: ${res.error}` })
          );
        }
        data = res.data;

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
        const res = await api(`https://mempool.space/testnet/api/address/${address}/txs`, 'GET');
        if (!res.success || !res.data) {
          throw (
            res.errorDetails ||
            new EaseSDKError({ code: ErrorCode.API_ERROR, message: `BTC history request failed: ${res.error}` })
          );
        }
        const txs = Array.isArray(res.data) ? res.data : [];

        return txs.map((tx: any) => {
          const isIncoming = tx.vout.some((v: any) => v.scriptpubkey_address === address);
          const amountSats = isIncoming
            ? tx.vout.find((v: any) => v.scriptpubkey_address === address)?.value || 0
            : tx.vin.find((v: any) => v.prevout?.scriptpubkey_address === address)?.prevout?.value || 0;

          return {
            id: tx.txid,
            type: isIncoming ? 'in' : 'out',
            amount: (amountSats / 1e8).toFixed(8),
            explorerURL: `https://mempool.space/testnet/tx/${tx.txid}`,
          };
        });
      }

      case 'ETH': {
        const res = await api(
          `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${ETHERSCAN_API_KEY}`,
          'GET',
        );
        if (!res.success || !res.data) {
          throw (
            res.errorDetails ||
            new EaseSDKError({ code: ErrorCode.API_ERROR, message: `ETH history request failed: ${res.error}` })
          );
        }
        data = res.data;

        if (!Array.isArray(data.result)) {
          logger.warn('Etherscan API returned non-array result for transaction history.', { data });
          return [];
        }

        return data.result.map((tx: any) => {
          const type = tx.to?.toLowerCase() === address.toLowerCase() ? 'in' : 'out';
          return {
            id: tx.hash,
            type,
            amount: (Number(tx.value) / 1e18).toFixed(8),
            explorerURL: `https://sepolia.etherscan.io/tx/${tx.hash}`,
          };
        });
      }

      default:
        throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: `Unsupported coin: ${coin}` });
    }
  } catch (error: unknown) {
    throw handleUnknownError(error, { coin, address, operation: 'getWalletHistory' });
  }
}
