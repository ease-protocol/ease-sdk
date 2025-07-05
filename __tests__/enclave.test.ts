import { getAttestation } from '../src/enclave';
import { api } from '../src/api';
import { EaseSDKError, ErrorCode } from '../src/utils/errors';
import * as crypto from '../src/utils/crypto';

jest.mock('../src/api');
jest.mock('../src/utils/crypto');

const mockApi = api as jest.MockedFunction<typeof api>;
const mockCrypto = crypto as jest.Mocked<typeof crypto>;

describe('Enclave Module', () => {
  beforeEach(() => {
    mockApi.mockClear();
    mockCrypto.parseAttestationDocument.mockClear();
  });

  describe('getAttestation', () => {
    it('should get attestation successfully', async () => {
      const mockAttestationDocument = {
        module_id: 'mockModuleId',
        digest: 'mockDigest',
        timestamp: 1234567890,
        pcrs: { '0': '010203' },
        cabundle: ['040506'],
        certificate: '070809',
        public_key: '0a0b0c',
        nonce: 'mockNonce',
      };

      const mockApiResponse = {
        success: true,
        data: {
          document: 'mockBase64EncodedDocument',
          publicKey: 'mockPublicKey',
        },
      };
      mockApi.mockResolvedValueOnce(mockApiResponse);
      mockCrypto.parseAttestationDocument.mockReturnValueOnce(mockAttestationDocument);

      const result = await getAttestation();

      expect(result).toEqual(mockAttestationDocument);
      expect(mockApi).toHaveBeenCalledWith(expect.stringMatching(/^\/enclave\/attestation\?nonce=[a-z0-9]+$/), 'GET', null, undefined, true);
      expect(mockCrypto.parseAttestationDocument).toHaveBeenCalledWith('mockBase64EncodedDocument');
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
