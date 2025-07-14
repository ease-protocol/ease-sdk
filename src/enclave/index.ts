import { internalApi as api } from '../api';
import { AttestationDocument, GetAttestationResponse } from '../utils/type';
import { EaseSDKError, ErrorCode, handleUnknownError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parseAttestationDocument } from '../utils/crypto';

export async function getAttestation(): Promise<AttestationDocument> {
  const nonce = Math.random().toString(36).substring(2); // Generate a random nonce
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
    return parseAttestationDocument(res.data.document);
  } catch (error) {
    handleUnknownError(error, { api: 'getAttestation', nonce });

    throw handleUnknownError(error, { api: 'getAttestation', nonce });
  }
}
