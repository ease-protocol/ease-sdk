import { api } from '../api';
import {
  Address,
  CreateKeysInput,
  CreateKeysResponse,
  CreateTransactionResponse,
  SignTransactionCallbackInput,
  SignTransactionCallbackResponse,
  SignTransactionOptionsResponse,
  TransactionIntent,
} from '../utils/type';
import { logger } from '../utils/logger';
import { EaseSDKError, ErrorCode, handleUnknownError } from '../utils/errors';

// get addresses
export async function getAddresses(accessToken: string): Promise<Address[]> {
  try {
    logger.debug('Attempting to fetch addresses.');
    const res = await api<Address[]>('/transaction/keys/addresses', 'GET', null, { Authorization: `Bearer ${accessToken.trim()}` });
    if (!res.success || !res.data) {
      logger.error(`Failed to fetch addresses. Error: ${res.error || 'Unknown error'}`, res.errorDetails);
      throw (
        res.errorDetails ||
        new EaseSDKError({ code: ErrorCode.API_ERROR, message: res.error || 'Unknown error fetching addresses' })
      );
    }
    if (!Array.isArray(res.data)) {
      logger.error('API returned non-array data for addresses.', { data: res.data });
      throw new EaseSDKError({ code: ErrorCode.API_ERROR, message: 'Invalid data format for addresses.' });
    }
    logger.info('Successfully fetched addresses.');
    return res.data.sort((a, b) => {
      if (a.coin === 'EASE' && b.coin !== 'EASE') return -1;
      if (b.coin === 'EASE' && a.coin !== 'EASE') return 1;
      return a.address.localeCompare(b.address);
    });
  } catch (error) {
    throw handleUnknownError(error, { api: 'getAddresses' });
  }
}

export async function createKeys(accessToken: string, input: CreateKeysInput): Promise<CreateKeysResponse> {
  if (!input || typeof input !== 'object') {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Input for createKeys must be an object.' });
  }
  // Add more specific validation for CreateKeysInput properties if needed

  try {
    logger.debug(`Attempting to create keys with input: ${JSON.stringify(input)}`);
    const res = await api<CreateKeysResponse>(`/transaction/keys/create`, 'POST', input, { Authorization: `Bearer ${accessToken.trim()}` } );
    if (!res.success || !res.data) {
      logger.error(`Failed to create keys. Error: ${res.error || 'Unknown error'}`, res.errorDetails);
      throw (
        res.errorDetails ||
        new EaseSDKError({ code: ErrorCode.API_ERROR, message: res.error || 'Unknown error creating keys' })
      );
    }
    logger.info('Successfully created keys.');
    return res.data;
  } catch (error) {
    throw handleUnknownError(error, { api: 'createKeys', input });
  }
}

export async function createTransaction(accessToken: string,  intent: TransactionIntent): Promise<CreateTransactionResponse> {
  if (!intent || typeof intent !== 'object') {
    throw new EaseSDKError({
      code: ErrorCode.INVALID_INPUT,
      message: 'Intent for createTransaction must be an object.',
    });
  }
  // Add more specific validation for TransactionIntent properties if needed

  try {
    logger.debug('Attempting to create transaction.', intent);
    const res = await api<CreateTransactionResponse>('/transaction/create', 'POST', intent, { Authorization: `Bearer ${accessToken.trim()}` });
    if (!res.success || !res.data) {
      logger.error('Failed to create transaction.', res.errorDetails || res.error);
      throw (
        res.errorDetails ||
        new EaseSDKError({ code: ErrorCode.API_ERROR, message: res.error || 'Unknown error creating transaction' })
      );
    }
    logger.info('Successfully created transaction.');
    return res.data;
  } catch (error) {
    throw handleUnknownError(error, { api: 'createTransaction', intent });
  }
}
export async function signTransactionOptions(accessToken: string): Promise<SignTransactionOptionsResponse> {
  try {
    logger.debug('Attempting to get sign transaction options.');
    const res = await api<SignTransactionOptionsResponse>('/transaction/sign/options', 'POST', {}, { Authorization: `Bearer ${accessToken.trim()}` });
    if (!res.success || !res.data) {
      logger.error(`Failed to get sign transaction options. Error: ${res.error || 'Unknown error'}`, res.errorDetails);
      throw (
        res.errorDetails ||
        new EaseSDKError({
          code: ErrorCode.API_ERROR,
          message: res.error || 'Unknown error getting sign transaction options',
        })
      );
    }
    if (res.data) {
      res.data.sessionId = res.headers?.get('X-Session-Id')!;
      logger.debug(`Retrieved session ID: ${res.data.sessionId}`);
    }
    logger.info('Successfully retrieved sign transaction options.');
    return res.data;
  } catch (error) {
    throw handleUnknownError(error, { api: 'signTransactionOptions' });
  }
}

export async function signTransactionCallback(
  accessToken: string,
  sessionId: string,
  input: SignTransactionCallbackInput,
): Promise<SignTransactionCallbackResponse> {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new EaseSDKError({ code: ErrorCode.INVALID_INPUT, message: 'Session ID must be a non-empty string.' });
  }
  if (!input || typeof input !== 'object') {
    throw new EaseSDKError({
      code: ErrorCode.INVALID_INPUT,
      message: 'Input for signTransactionCallback must be an object.',
    });
  }
  // Add more specific validation for SignTransactionCallbackInput properties if needed

  try {
    logger.debug(
      `Attempting to sign transaction callback for session: ${sessionId} with input: ${JSON.stringify(input)}`,
    );
    const res = await api<SignTransactionCallbackResponse>(`/transaction/sign/callback`, 'POST', input, {
      Authorization: `Bearer ${accessToken.trim()}`,
      'X-Session-Id': sessionId,
    });
    if (!res.success || !res.data) {
      logger.error(
        `Failed to sign transaction callback for session: ${sessionId}. Error: ${res.error || 'Unknown error'}`,
        res.errorDetails,
      );
      throw (
        res.errorDetails ||
        new EaseSDKError({
          code: ErrorCode.API_ERROR,
          message: res.error || 'Unknown error signing transaction callback',
        })
      );
    }
    logger.info(`Successfully signed transaction callback for session: ${sessionId}.`);
    return res.data;
  } catch (error) {
    throw handleUnknownError(error, { api: 'signTransactionCallback', sessionId, input });
  }
}
