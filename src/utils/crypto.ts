import { decode } from 'cbor2';
import { AttestationDocument, RecipientData } from './type';
import { internalApi } from '../api';
import { logger } from './logger';

export async function encryptRecipientData<T>(publicKeyBase64: string, data: T): Promise<RecipientData<T>> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    const url = `https://etherscan-proxy-am1u.vercel.app/api/encrypt`;

    logger.debug('Web Crypto API is not available, falling back to internal API for recipient data encryption.');
    logger.debug(`Requesting recipient data from internal API: ${url}`);

    const response = await internalApi<RecipientData<T>>(
      url,
      'POST',
      { publicKeyBase64, data },
      undefined,
      false,
      true,
    );
    if (!response.data) {
      throw new Error('Failed to retrieve recipient data');
    }

    logger.debug('Received recipient data from internal API:', response.data);
    return response.data;
  }

  const plaintext = JSON.stringify(data);

  // decode the base64 encoded DER public key
  const derBytes = base64ToBytes(publicKeyBase64);

  let publicKey: CryptoKey;
  try {
    // import the public key
    publicKey = await crypto.subtle.importKey(
      'spki',
      derBytes.buffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt'],
    );
  } catch (error) {
    throw new Error(`Failed to import public key: ${error}`);
  }

  let aesKey: CryptoKey;
  try {
    // generate a random AES-GCM key
    aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  } catch (error) {
    throw new Error(`Failed to generate AES key: ${error}`);
  }

  let rawAesKey: ArrayBuffer;
  try {
    // export raw AES key bytes
    rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  } catch (error) {
    throw new Error(`Failed to export AES key: ${error}`);
  }

  let encryptedKey: ArrayBuffer;
  try {
    // encrypt AES key with RSA public key
    encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey);
  } catch (error) {
    throw new Error(`Failed to encrypt AES key with RSA public key: ${error}`);
  }
  const encryptedKeyBytes = new Uint8Array(encryptedKey);

  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended
  let ciphertext: ArrayBuffer;
  try {
    // encrypt the plaintext with AES-GCM
    ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(plaintext));
  } catch (error) {
    throw new Error(`Failed to encrypt plaintext with AES-GCM: ${error}`);
  }
  const ciphertextBytes = new Uint8Array(ciphertext);

  return {
    data: btoa(String.fromCharCode(...iv, ...ciphertextBytes)),
    encryptedKey: btoa(String.fromCharCode(...encryptedKeyBytes)),
  };
}

export function parseAttestationDocument(attestationDocBase64: string): AttestationDocument {
  const rawBytes = base64ToBytes(attestationDocBase64);
  let coseSign1Data: [Uint8Array, {}, Uint8Array, Uint8Array];
  try {
    coseSign1Data = decode(rawBytes) as [Uint8Array, {}, Uint8Array, Uint8Array];
  } catch (error) {
    throw new Error(`Failed to decode COSE_Sign1 data: ${error}`);
  }

  let payload: Record<string, any>;
  try {
    payload = decode(coseSign1Data[2]) as Record<string, any>;
  } catch (error) {
    throw new Error(`Failed to decode attestation document payload: ${error}`);
  }

  const pcrs: Record<string, string> = {};
  if (payload.pcrs instanceof Map) {
    for (const [k, v] of payload.pcrs.entries()) {
      if (v instanceof Uint8Array) {
        pcrs[k.toString()] = bytesToHex(v);
      }
    }
  }

  const cabundle: string[] = [];
  if (Array.isArray(payload.cabundle)) {
    for (const item of payload.cabundle) {
      if (item instanceof Uint8Array) {
        cabundle.push(bytesToBase64(item));
      }
    }
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
  return doc;
}

function base64ToBytes(base64String: string) {
  return Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((v) => v.toString(16).padStart(2, '0')).join('');
}
