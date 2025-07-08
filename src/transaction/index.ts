import { internalApi as api } from '../api';
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
import { telemetry } from '../telemetry';
import { EaseSDKError, ErrorCode, handleUnknownError, ValidationError } from '../utils/errors';

const validateAccessToken = (token: string) => {
  if (!token || typeof token !== 'string') {
    throw new ValidationError(ErrorCode.INVALID_INPUT, 'Access token must be a non-empty string.');
  }
};

// get addresses
export async function getAddresses(accessToken: string): Promise<Address[]> {
  validateAccessToken(accessToken);
  try {
    logger.debug('Attempting to fetch addresses.');
    const res = await api<Address[]>('/transaction/keys/addresses', 'GET', null, {
      Authorization: `Bearer ${accessToken.trim()}`,
    });
    if (!res.success || !res.data) {
      logger.error(`Failed to fetch addresses. Error: ${res.error || 'Unknown error'}`, res.error);
      throw new EaseSDKError({ code: ErrorCode.API_ERROR, message: res.error || 'Unknown error fetching addresses' });
    }
    if (!Array.isArray(res.data)) {
      logger.error('API returned non-array data for addresses.', { data: res.data });
      throw new EaseSDKError({ code: ErrorCode.API_ERROR, message: 'Invalid data format for addresses.' });
    }
    logger.info('Successfully fetched addresses.');
    telemetry.trackEvent('get_addresses_success');
    return res.data.sort((a: Address, b: Address) => {
      if (a.coin === 'EASE' && b.coin !== 'EASE') return -1;
      if (b.coin === 'EASE' && a.coin !== 'EASE') return 1;
      return a.address.localeCompare(b.address);
    });
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'getAddresses' });
    telemetry.trackError(enhancedError, { api: 'getAddresses' });
    throw enhancedError;
  }
}

export async function createKeys(accessToken: string, input: CreateKeysInput): Promise<CreateKeysResponse> {
  validateAccessToken(accessToken);
  if (!input || typeof input !== 'object') {
    throw new ValidationError(ErrorCode.INVALID_INPUT, 'Input for createKeys must be an object.');
  }

  try {
    logger.debug(`Attempting to create keys with input: ${JSON.stringify(input)}`);
    const res = await api<CreateKeysResponse>(`/transaction/keys/create`, 'POST', input, {
      Authorization: `Bearer ${accessToken.trim()}`,
    });
    if (!res.success || !res.data) {
      logger.error(`Failed to create keys. Error: ${res.error || 'Unknown error'}`, res.error);
      throw new EaseSDKError({ code: ErrorCode.API_ERROR, message: res.error || 'Unknown error creating keys' });
    }
    logger.info('Successfully created keys.');
    telemetry.trackEvent('create_keys_success');
    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'createKeys', input });
    telemetry.trackError(enhancedError, { api: 'createKeys', input });
    throw enhancedError;
  }
}

export async function createTransaction(
  accessToken: string,
  intent: TransactionIntent,
): Promise<CreateTransactionResponse> {
  validateAccessToken(accessToken);
  if (!intent || typeof intent !== 'object') {
    throw new ValidationError(ErrorCode.INVALID_INPUT, 'Intent for createTransaction must be an object.');
  }

  try {
    logger.debug('Attempting to create transaction.', intent);
    const res = await api<CreateTransactionResponse>('/transaction/create', 'POST', intent, {
      Authorization: `Bearer ${accessToken.trim()}`,
    });
    if (!res.success || !res.data) {
      logger.error('Failed to create transaction.', res.error || 'Unknown error');
      throw new EaseSDKError({ code: ErrorCode.API_ERROR, message: res.error || 'Unknown error creating transaction' });
    }
    logger.info('Successfully created transaction.');
    telemetry.trackEvent('create_transaction_success', { coin: intent.coin });
    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'createTransaction', intent });
    telemetry.trackError(enhancedError, { api: 'createTransaction', intent });
    throw enhancedError;
  }
}

export async function signTransactionOptions(accessToken: string): Promise<SignTransactionOptionsResponse> {
  validateAccessToken(accessToken);
  try {
    logger.debug('Attempting to get sign transaction options.');
    const res = await api<SignTransactionOptionsResponse>(
      '/transaction/sign/options',
      'POST',
      {},
      { Authorization: `Bearer ${accessToken.trim()}` },
    );
    if (!res.success || !res.data) {
      logger.error(`Failed to get sign transaction options. Error: ${res.error || 'Unknown error'}`, res.error);
      throw new EaseSDKError({
        code: ErrorCode.API_ERROR,
        message: res.error || 'Unknown error getting sign transaction options',
      });
    }
    if (res.data) {
      res.data.sessionId = res.headers?.get('X-Session-Id')!;
      logger.debug(`Retrieved session ID: ${res.data.sessionId}`);
    }
    logger.info('Successfully retrieved sign transaction options.');
    telemetry.trackEvent('sign_transaction_options_success', { sessionId: res.data.sessionId });
    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'signTransactionOptions' });
    telemetry.trackError(enhancedError, { api: 'signTransactionOptions' });
    throw enhancedError;
  }
}

export async function signTransactionCallback(
  accessToken: string,
  sessionId: string,
  input: SignTransactionCallbackInput,
): Promise<SignTransactionCallbackResponse> {
  validateAccessToken(accessToken);
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new ValidationError(ErrorCode.INVALID_INPUT, 'Session ID must be a non-empty string.');
  }
  if (!input || typeof input !== 'object') {
    throw new ValidationError(ErrorCode.INVALID_INPUT, 'Input for signTransactionCallback must be an object.');
  }

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
        res.error,
      );
      throw new EaseSDKError({
        code: ErrorCode.API_ERROR,
        message: res.error || 'Unknown error signing transaction callback',
      });
    }
    logger.info(`Successfully signed transaction callback for session: ${sessionId}.`);
    telemetry.trackEvent('sign_transaction_callback_success', { sessionId });
    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'signTransactionCallback', sessionId, input });
    telemetry.trackError(enhancedError, { api: 'signTransactionCallback', sessionId, input });
    throw enhancedError;
  }
}
