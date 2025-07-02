import { api } from '../api';
import { GetAttestationResponse } from '../utils/type';
import { EaseSDKError, ErrorCode, handleUnknownError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function getAttestation(nonce: string): Promise<GetAttestationResponse> {
  if (typeof nonce !== 'string' || nonce.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Nonce must be a non-empty string.' });
  }
  try {
    logger.debug(`Attempting to get attestation for nonce: ${nonce}`);
    const res = await api<GetAttestationResponse>(`/enclave/attestation?nonce=${nonce}`, 'GET', null, undefined, true);
    if (!res.success || !res.data) {
      logger.error(
        `Failed to get attestation for nonce: ${nonce}. Error: ${res.error || 'Unknown error'}`,
        res.errorDetails,
      );
      throw (
        res.errorDetails ||
        new EaseSDKError({ code: ErrorCode.API_ERROR, message: res.error || 'Unknown error getting attestation' })
      );
    }
    logger.info(`Successfully retrieved attestation for nonce: ${nonce}.`);
    return res.data;
  } catch (error) {
    throw handleUnknownError(error, { api: 'getAttestation', nonce });
  }
}
