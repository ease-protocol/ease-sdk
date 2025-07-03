import {
  truncateAddress,
  getWalletInfo,
  ammountToSmallestUnit,
  explorerUrlFromResponse,
  getWalletBalance,
  getWalletHistory,
} from '../src/wallet';
import { EaseSDKError, ErrorCode, NetworkError, APIError } from '../src/utils/errors';
import { logger } from '../src/utils/logger';
import { api } from '../src/api';

// Mock the api module
jest.mock('../src/api', () => ({
  api: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the logger to prevent console output during tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    configure: jest.fn(),
  },
}));

const mockApi = api as jest.MockedFunction<typeof api>;

describe('wallet', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    logger.configure({ level: 4 }); // Suppress logs during tests
  });

  describe('truncateAddress', () => {
    it('should truncate an address longer than 20 characters', () => {
      expect(truncateAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234...345678');
    });

    it('should not truncate an address shorter than 20 characters', () => {
      expect(truncateAddress('0x123')).toBe('0x123');
    });

    it('should not truncate an address exactly 20 characters long', () => {
      expect(truncateAddress('0x123456789012345678')).toBe('0x123456789012345678');
    });

    it('should handle empty string', () => {
      expect(truncateAddress('')).toBe('');
    });

    it('should throw an error for non-string input', () => {
      expect(() => truncateAddress(123 as any)).toThrow(EaseSDKError);
      expect(() => truncateAddress(null as any)).toThrow(EaseSDKError);
      expect(() => truncateAddress(undefined as any)).toThrow(EaseSDKError);
    });
  });

  describe('getWalletInfo', () => {
    it('should return wallet info for EASE', () => {
      expect(getWalletInfo('EASE')).toEqual({ name: 'EASE', accent: '#1b1818' });
    });

    it('should return wallet info for BTC', () => {
      expect(getWalletInfo('BTC')).toEqual({ name: 'Bitcoin', accent: '#f7931a' });
    });

    it('should return wallet info for ETH', () => {
      expect(getWalletInfo('ETH')).toEqual({ name: 'Ethereum', accent: '#000000' });
    });

    it('should return default wallet info for unknown coin', () => {
      expect(getWalletInfo('UNKNOWN')).toEqual({ name: 'UNKNOWN', accent: '#1b1818' });
    });
  });

  describe('ammountToSmallestUnit', () => {
    it('should convert amount to smallest unit for EASE', () => {
      expect(ammountToSmallestUnit('EASE', 1)).toBe(10000);
      expect(ammountToSmallestUnit('EASE', 0)).toBe(0);
      expect(ammountToSmallestUnit('EASE', -1)).toBe(-10000);
    });

    it('should convert amount to smallest unit for BTC', () => {
      expect(ammountToSmallestUnit('BTC', 1)).toBe(100000000);
      expect(ammountToSmallestUnit('BTC', 0)).toBe(0);
      expect(ammountToSmallestUnit('BTC', -1)).toBe(-100000000);
    });

    it('should convert amount to smallest unit for ETH', () => {
      expect(ammountToSmallestUnit('ETH', 1)).toBe(1e18);
      expect(ammountToSmallestUnit('ETH', 0)).toBe(0);
      expect(ammountToSmallestUnit('ETH', -1)).toBe(-1e18);
    });

    it('should throw error for unsupported coin type', () => {
      expect(() => ammountToSmallestUnit('UNKNOWN', 1)).toThrow('Unsupported coin type: UNKNOWN');
    });
  });

  describe('explorerUrlFromResponse', () => {
    it('should return explorer URL for BTC', () => {
      expect(explorerUrlFromResponse('BTC', 'tx123')).toBe('https://mempool.space/testnet/tx/tx123');
    });

    it('should return explorer URL for ETH', () => {
      expect(explorerUrlFromResponse('ETH', 'tx456')).toBe('https://sepolia.etherscan.io/tx/tx456');
    });

    it('should return empty explorer URL for EASE', () => {
      expect(explorerUrlFromResponse('EASE', 'tx789')).toBe('');
    });

    it('should return empty explorer URL for unknown coin', () => {
      expect(explorerUrlFromResponse('UNKNOWN', 'tx000')).toBe('');
    });

    it('should handle null response', () => {
      expect(explorerUrlFromResponse('BTC', null)).toBe('https://mempool.space/testnet/tx/null');
    });

    it('should handle undefined response', () => {
      expect(explorerUrlFromResponse('ETH', undefined)).toBe('https://sepolia.etherscan.io/tx/undefined');
    });
  });

  describe('getWalletBalance', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      logger.configure({ level: 4 }); // Suppress logs during tests
    });

    it('should get EASE wallet balance', async () => {
      mockApi.mockResolvedValueOnce({ success: true, data: ['10.0000 EASE'] });
      const balance = await getWalletBalance('EASE', 'testAddress');
      expect(balance).toBe('10.0000');
      expect(mockApi).toHaveBeenCalledWith('/v1/chain/get_currency_balance', 'POST', {
        account: 'testAddress',
        code: 'eosio.token',
        symbol: 'EASE',
      }, undefined, true);
    });

    it('should get BTC wallet balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ chain_stats: { funded_txo_sum: 200000000, spent_txo_sum: 100000000 } }),
      } as Response);
      const balance = await getWalletBalance('BTC', 'testAddress');
      expect(balance).toBe('1.00000000');
      expect(mockFetch).toHaveBeenCalledWith('https://mempool.space/testnet/api/address/testAddress');
    });

    it('should get ETH wallet balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ result: '1000000000000000000' }),
      } as Response);
      const balance = await getWalletBalance('ETH', 'testAddress');
      expect(balance).toBe('1.00000000');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('https://api-sepolia.etherscan.io/api'));
    });

    it('should throw NetworkError on API failure for getWalletBalance', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
      await expect(getWalletBalance('ETH', 'testAddress')).rejects.toThrow(EaseSDKError);
    });

    it('should throw APIError on non-ok response for getWalletBalance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({}),
      } as Response);
      await expect(getWalletBalance('ETH', 'testAddress')).rejects.toThrow(EaseSDKError);
    });

    it('should throw APIError on 500 response for getWalletBalance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      } as Response);
      await expect(getWalletBalance('ETH', 'testAddress')).rejects.toThrow(EaseSDKError);
    });

    it('should throw EaseSDKError for unsupported coin in getWalletBalance', async () => {
      await expect(getWalletBalance('UNKNOWN', 'testAddress')).rejects.toThrow(EaseSDKError);
      await expect(getWalletBalance('UNKNOWN', 'testAddress')).rejects.toHaveProperty('code', ErrorCode.INVALID_INPUT);
    });
  });

  describe('getWalletHistory', () => {
    it('should get EASE wallet history', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {
          actions: [
            {
              act: { account: 'eosio.token', name: 'transfer', data: { to: 'testAddress', quantity: '5.0000 EASE' } },
              trx_id: 'trx1',
            },
            {
              act: { account: 'eosio.token', name: 'transfer', data: { to: 'otherAddress', quantity: '2.0000 EASE' } },
              trx_id: 'trx2',
            },
          ],
        },
      });
      const history = await getWalletHistory('EASE', 'testAddress');
      expect(history).toEqual([
        { id: 'trx1', type: 'in', amount: '5.0000', explorerURL: '' },
        { id: 'trx2', type: 'out', amount: '2.0000', explorerURL: '' },
      ]);
      expect(mockApi).toHaveBeenCalledWith('/v2/history/get_actions', 'GET', {
        account: 'testAddress', limit: 20 }, undefined, true);
    });

    it('should get BTC wallet history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () =>
          Promise.resolve([
            { txid: 'btc_trx1', vout: [{ scriptpubkey_address: 'testAddress', value: 100000000 }], vin: [] },
            { txid: 'btc_trx2', vout: [], vin: [{ prevout: { scriptpubkey_address: 'testAddress', value: 50000000 } }] },
          ]),
      } as Response);
      const history = await getWalletHistory('BTC', 'testAddress');
      expect(history).toEqual([
        { id: 'btc_trx1', type: 'in', amount: '1.00000000', explorerURL: 'https://mempool.space/testnet/tx/btc_trx1' },
        { id: 'btc_trx2', type: 'out', amount: '0.50000000', explorerURL: 'https://mempool.space/testnet/tx/btc_trx2' },
      ]);
      expect(mockFetch).toHaveBeenCalledWith('https://mempool.space/testnet/api/address/testAddress/txs');
    });

    it('should get ETH wallet history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            result: [
              { hash: 'eth_trx1', to: 'testAddress', value: '2000000000000000000' },
              { hash: 'eth_trx2', to: 'otherAddress', value: '1000000000000000000' },
            ],
          }),
      } as Response);
      const history = await getWalletHistory('ETH', 'testAddress');
      expect(history).toEqual([
        { id: 'eth_trx1', type: 'in', amount: '2.00000000', explorerURL: 'https://sepolia.etherscan.io/tx/eth_trx1' },
        { id: 'eth_trx2', type: 'out', amount: '1.00000000', explorerURL: 'https://sepolia.etherscan.io/tx/eth_trx2' },
      ]);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('https://api-sepolia.etherscan.io/api'));
    });

    it('should throw NetworkError on API failure for getWalletHistory', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
      await expect(getWalletHistory('ETH', 'testAddress')).rejects.toThrow(EaseSDKError);
    });

    it('should throw APIError on non-ok response for getWalletHistory', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      } as Response);
      await expect(getWalletHistory('ETH', 'testAddress')).rejects.toThrow(EaseSDKError);
    });

    it('should throw APIError on 404 response for getWalletHistory', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({}),
      } as Response);
      await expect(getWalletHistory('ETH', 'testAddress')).rejects.toThrow(EaseSDKError);
    });

    it('should throw EaseSDKError for unsupported coin in getWalletHistory', async () => {
      await expect(getWalletHistory('UNKNOWN', 'testAddress')).rejects.toThrow(EaseSDKError);
      await expect(getWalletHistory('UNKNOWN', 'testAddress')).rejects.toHaveProperty('code', ErrorCode.INVALID_INPUT);
    });
  });
});
