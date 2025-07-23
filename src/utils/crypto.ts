import { getUrl } from './urls';
import { decode } from 'cbor2';
import { AttestationDocument, RecipientData } from './type';
import { internalApi } from '../api';
import { logger } from './logger';

export async function encryptRecipientData<T>(publicKeyBase64: string, data: T): Promise<RecipientData<T>> {
  try {
    const url = `${getUrl('ETHERSCAN_PROXY')}/api/encrypt`;

    logger.debug(`Requesting encryption of recipient data from internal API: ${url}`);

    const response = await internalApi<RecipientData<T>>(
      url,
      'POST',
      { publicKeyBase64, data },
      undefined,
      false,
      true,
    );

    if (!response.success) {
      logger.error('Encryption of recipient data failed:', {
        error: response.error,
        statusCode: response.statusCode,
      });
      throw new Error(response.error || 'Failed to encrypt recipient data');
    }

    if (!response.data) {
      logger.error('Encryption of recipient data failed: No data received in response.');
      throw new Error('Failed to encrypt recipient data: No data received');
    }

    logger.debug('Successfully encrypted recipient data:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Error encrypting recipient data:', error);
    throw error;
  }
}

export function parseAttestationDocument(attestationDocBase64: string): AttestationDocument {
  logger.debug('Starting to parse attestation document.');
  try {
    const rawBytes = base64ToBytes(attestationDocBase64);
    let coseSign1Data: [Uint8Array, {}, Uint8Array, Uint8Array];
    try {
      coseSign1Data = decode(rawBytes) as [Uint8Array, {}, Uint8Array, Uint8Array];
      logger.debug('Successfully decoded COSE_Sign1 data.');
    } catch (error) {
      logger.error(`Failed to decode COSE_Sign1 data: ${error}`);
      throw new Error(`Failed to decode COSE_Sign1 data: ${error}`);
    }

    let payload: Record<string, any>;
    try {
      payload = decode(coseSign1Data[2]) as Record<string, any>;
      logger.debug('Successfully decoded attestation document payload.');
    } catch (error) {
      logger.error(`Failed to decode attestation document payload: ${error}`);
      throw new Error(`Failed to decode attestation document payload: ${error}`);
    }

    const pcrs: Record<string, string> = {};
    if (payload.pcrs instanceof Map) {
      for (const [k, v] of payload.pcrs.entries()) {
        if (v instanceof Uint8Array) {
          pcrs[k.toString()] = bytesToHex(v);
        }
      }
      logger.debug('Successfully processed PCRs from payload.');
    } else {
      logger.warn('PCRs not found or not in expected format in payload.');
    }

    const cabundle: string[] = [];
    if (Array.isArray(payload.cabundle)) {
      for (const item of payload.cabundle) {
        if (item instanceof Uint8Array) {
          cabundle.push(bytesToBase64(item));
        }
      }
      logger.debug('Successfully processed cabundle from payload.');
    } else {
      logger.warn('Cabundle not found or not in expected format in payload.');
    }

    const doc: AttestationDocument = {
      module_id: typeof payload.module_id === 'string' ? payload.module_id : '',
      digest: typeof payload.digest === 'string' ? payload.digest : '',
      timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : 0,
      pcrs,
      cabundle,
      certificate: payload.certificate instanceof Uint8Array ? bytesToBase64(payload.certificate) : '',
      public_key: payload.public_key instanceof Uint8Array ? bytesToBase64(payload.public_key) : '',
      nonce: payload.nonce instanceof Uint8Array ? new TextDecoder().decode(payload.nonce) : '',
    };
    logger.debug('Successfully parsed attestation document.');
    return doc;
  } catch (error) {
    logger.error(`Error parsing attestation document: ${error}`);
    throw error;
  }
}

export async function generateRsaKeyPair() {
  try {
    const url = `${getUrl('ETHERSCAN_PROXY')}/api/generateKeysPair`;
    logger.debug(`Requesting RSA key pair generation from internal API: ${url}`);
    const response = await internalApi<{ publicKey: string; privateKey: string }>(
      url,
      'GET',
      null,
      undefined,
      false,
      true,
    );

    if (!response.success) {
      logger.error('Failed to generate RSA key pair:', response.error);
      throw new Error(response.error || 'Failed to generate RSA key pair');
    }

    if (!response.data) {
      logger.error('Failed to generate RSA key pair: No data received', response);
      throw new Error('Failed to generate RSA key pair: No data received');
    }

    logger.debug('Successfully generated RSA key pair:', response.data);

    return response.data;
  } catch (error) {
    logger.error('Error generating RSA key pair:', error);
    throw error;
  }
}

export async function decryptRecipientData(privateKeyBase64: string, recipientData: RecipientData) {
  try {
    const url = `${getUrl('ETHERSCAN_PROXY')}/api/decrypt`;
    logger.debug(`Requesting decryption from internal API: ${url}`);
    const response = await internalApi<any>(
      url,
      'POST',
      { privateKeyBase64, data: recipientData },
      undefined,
      false,
      true,
    );

    if (!response.data) {
      logger.error('Failed to decrypt data: No data received', response);
      throw new Error('Failed to decrypt data: No data received');
    }

    logger.debug('Successfully decrypted data from internal API:', response.data);

    return response.data;
  } catch (error) {
    logger.error('Error decrypting data:', error);
    throw error;
  }
}

function base64ToBytes(base64String: string): Uint8Array {
  try {
    return Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
  } catch (error) {
    logger.error(`Failed to decode base64 string: ${base64String}`, error);
    throw new Error(`Invalid base64 string: ${error}`);
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  try {
    return btoa(String.fromCharCode(...bytes));
  } catch (error) {
    logger.error(`Failed to encode bytes to base64: ${bytes}`, error);
    throw new Error(`Failed to encode bytes to base64: ${error}`);
  }
}

function bytesToHex(bytes: Uint8Array): string {
  try {
    return [...bytes].map((v) => v.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    logger.error(`Failed to convert bytes to hex: ${bytes}`, error);
    throw new Error(`Failed to convert bytes to hex: ${error}`);
  }
}
