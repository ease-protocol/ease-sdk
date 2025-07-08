import { internalApi } from '../../src/api';
import {
  getAddresses,
  createKeys,
  createTransaction,
  signTransactionOptions,
  signTransactionCallback,
} from '../../src/transaction';
import { EaseSDKError, ErrorCode, APIError } from '../../src/utils/errors';
import { logger } from '../../src/utils/logger';

// Mock the api module
jest.mock('../../src/api', () => ({
  internalApi: jest.fn(),
}));

const mockApi = internalApi as jest.MockedFunction<typeof internalApi>;

describe('Transaction API', () => {
  const accessToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
    logger.configure({ level: 4 }); // Suppress logs during tests
  });

  describe('getAddresses', () => {
    it('should return sorted addresses on success', async () => {
      const mockAddresses = [
        { address: 'addr2', derivationPath: 'path2', coin: 'BTC' },
        { address: 'addr1', derivationPath: 'path1', coin: 'EASE' },
        { address: 'addr3', derivationPath: 'path3', coin: 'ETH' },
      ];
      mockApi.mockResolvedValueOnce({ success: true, data: mockAddresses });

      const result = await getAddresses(accessToken);

      expect(mockApi).toHaveBeenCalledWith('/transaction/keys/addresses', 'GET', null, {
        Authorization: `Bearer ${accessToken}`,
      });
      expect(result).toEqual([
        { address: 'addr1', derivationPath: 'path1', coin: 'EASE' },
        { address: 'addr2', derivationPath: 'path2', coin: 'BTC' },
        { address: 'addr3', derivationPath: 'path3', coin: 'ETH' },
      ]);
    });

    it('should throw EaseSDKError on API failure', async () => {
      const apiError = new APIError('Failed to fetch', 500);
      mockApi.mockResolvedValueOnce({ success: false, error: apiError });

      await expect(getAddresses(accessToken)).rejects.toThrow(EaseSDKError);
    });

    it('should throw EaseSDKError with NETWORK_ERROR code on network failure', async () => {
      mockApi.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(getAddresses(accessToken)).rejects.toThrow(EaseSDKError);
      await expect(getAddresses(accessToken)).rejects.toHaveProperty('code', ErrorCode.NETWORK_ERROR);
    });
  });

  describe('createKeys', () => {
    const mockInput = {
      accountName: 'test',
      recipientPublicKey: 'pubkey',
      recipientData: { mnemonic: 'mnem', password: 'pass' },
    };
    const mockResponse = { recipientData: { mnemonic: 'mnem' } };

    it('should return response on success', async () => {
      mockApi.mockResolvedValueOnce({ success: true, data: mockResponse });

      const result = await createKeys(accessToken, mockInput as any);

      expect(mockApi).toHaveBeenCalledWith(`/transaction/keys/create`, 'POST', mockInput, {
        Authorization: `Bearer ${accessToken}`,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw EaseSDKError on API failure', async () => {
      const apiError = new APIError('Failed to create', 400);
      mockApi.mockResolvedValueOnce({ success: false, error: apiError });

      await expect(createKeys(accessToken, mockInput as any)).rejects.toThrow(EaseSDKError);
    });
  });

  describe('createTransaction', () => {
    const mockIntent = {
      from: 'fromAddr',
      to: 'toAddr',
      coin: 'EASE',
      amount: 10,
    };
    const mockResponse = { coin: 'EASE', transaction: {}, params: {} };

    it('should return response on success', async () => {
      mockApi.mockResolvedValueOnce({ success: true, data: mockResponse });

      const result = await createTransaction(accessToken, mockIntent);

      expect(mockApi).toHaveBeenCalledWith('/transaction/create', 'POST', mockIntent, {
        Authorization: `Bearer ${accessToken}`,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw EaseSDKError on API failure', async () => {
      const apiError = new APIError('Failed to create transaction', 500);
      mockApi.mockResolvedValueOnce({ success: false, error: apiError });

      await expect(createTransaction(accessToken, mockIntent)).rejects.toThrow(EaseSDKError);
    });
  });

  describe('signTransactionOptions', () => {
    const mockResponse = {
      publicKey: { challenge: 'chal' },
      sessionId: 'session123',
    };

    it('should return response with sessionId on success', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: { publicKey: { challenge: 'chal' } },
        headers: new Headers({ 'X-Session-Id': 'session123' }),
      });

      const result = await signTransactionOptions(accessToken);

      expect(mockApi).toHaveBeenCalledWith(
        '/transaction/sign/options',
        'POST',
        {},
        { Authorization: `Bearer ${accessToken}` },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw EaseSDKError on API failure', async () => {
      const apiError = new APIError('Failed to get options', 401);
      mockApi.mockResolvedValueOnce({ success: false, error: apiError });

      await expect(signTransactionOptions(accessToken)).rejects.toThrow(EaseSDKError);
    });
  });

  describe('signTransactionCallback', () => {
    const mockSessionId = 'session123';
    const mockInput = {
      response: { clientDataJSON: 'data' },
      coin: 'EASE',
      recipientData: { transaction: {}, params: {} },
    };
    const mockResponse = { coin: 'EASE', response: {} };

    it('should return response on success', async () => {
      mockApi.mockResolvedValueOnce({ success: true, data: mockResponse });

      const result = await signTransactionCallback(accessToken, mockSessionId, mockInput as any);

      expect(mockApi).toHaveBeenCalledWith(`/transaction/sign/callback`, 'POST', mockInput, {
        'X-Session-Id': mockSessionId,
        Authorization: `Bearer ${accessToken}`,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw EaseSDKError on API failure', async () => {
      const apiError = new APIError('Failed to sign callback', 403);
      mockApi.mockResolvedValueOnce({ success: false, error: apiError });

      await expect(signTransactionCallback(accessToken, mockSessionId, mockInput as any)).rejects.toThrow(EaseSDKError);
    });
  });
});
