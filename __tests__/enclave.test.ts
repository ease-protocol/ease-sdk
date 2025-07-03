import { getAttestation } from '../src/enclave';
import { api } from '../src/api';
import { EaseSDKError, ErrorCode } from '../src/utils/errors';

jest.mock('../src/api');
const mockApi = api as jest.MockedFunction<typeof api>;

describe('Enclave Module', () => {
  beforeEach(() => {
    mockApi.mockClear();
  });

  describe('getAttestation', () => {
    it('should get attestation successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          document: 'mockDocument',
          publicKey: 'mockPublicKey',
        },
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      const result = await getAttestation();

      expect(result).toEqual(mockResponse.data);
      expect(mockApi).toHaveBeenCalledWith(expect.stringMatching(/\/enclave\/attestation\?nonce=.+/), 'GET', null, undefined, true);
    });

    it('should handle API error responses', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Service unavailable',
        statusCode: 503,
      });

      const error = await getAttestation().catch((e) => e);
      expect(error).toBeInstanceOf(EaseSDKError);
      expect(error.code).toBe(ErrorCode.API_ERROR);
    });

    it('should handle missing data in response', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await expect(getAttestation()).rejects.toThrow(EaseSDKError);
    });

    it('should handle unexpected errors', async () => {
      mockApi.mockRejectedValueOnce(new Error('Network error'));

      await expect(getAttestation()).rejects.toThrow();
    });
  });
});
