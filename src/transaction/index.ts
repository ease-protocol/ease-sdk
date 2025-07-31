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
import { EaseSDKError, ErrorCode, handleUnknownError, ValidationError } from '../utils/errors';

/**
 * Validates the provided access token.
 * @param {string} token The access token to validate.
 * @throws {ValidationError} If the access token is invalid or missing.
 */
const validateAccessToken = (token: string) => {
  if (!token || typeof token !== 'string') {
    throw new ValidationError(ErrorCode.INVALID_INPUT, 'Access token must be a non-empty string.');
  }
};

// get addresses
/**
 * Retrieves a list of addresses associated with the authenticated user.
 *
 * @param {string} accessToken The access token for authorization.
 * @returns {Promise<Address[]>} A promise that resolves with an array of address objects.
 * @throws {ValidationError} If the access token is invalid or missing.
 * @throws {EaseSDKError} If the API call fails or returns an invalid response.
 */
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

    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'getAddresses' });
    throw enhancedError;
  }
}

/**
 * Creates new keys for the authenticated user.
 *
 * @param {string} accessToken The access token for authorization.
 * @param {CreateKeysInput} input The input data for creating keys, including account name, recipient public key, and recipient data.
 * @returns {Promise<CreateKeysResponse>} A promise that resolves with the response containing recipient data.
 * @throws {ValidationError} If the access token or input are invalid or missing.
 * @throws {EaseSDKError} If the API call fails or returns an invalid response.
 */
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
    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'createKeys', input });
    throw enhancedError;
  }
}

/**
 * Creates a new transaction intent.
 *
 * @param {string} accessToken The access token for authorization.
 * @param {TransactionIntent} intent The transaction intent details, including from, to, coin, amount, and optional memo.
 * @returns {Promise<CreateTransactionResponse>} A promise that resolves with the created transaction response.
 * @throws {ValidationError} If the access token or intent are invalid or missing.
 * @throws {EaseSDKError} If the API call fails or returns an invalid response.
 */
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
    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'createTransaction', intent });
    throw enhancedError;
  }
}

/**
 * Retrieves options required to sign a transaction.
 *
 * @param {string} accessToken The access token for authorization.
 * @returns {Promise<SignTransactionOptionsResponse>} A promise that resolves with the sign transaction options, including a session ID.
 * @throws {ValidationError} If the access token is invalid or missing.
 * @throws {EaseSDKError} If the API call fails or returns an invalid response.
 */
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
    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'signTransactionOptions' });
    throw enhancedError;
  }
}

/**
 * Completes the transaction signing process by sending the signed transaction data back to the API.
 *
 * @param {string} accessToken The access token for authorization.
 * @param {string} sessionId The session ID obtained from `signTransactionOptions`.
 * @param {SignTransactionCallbackInput} input The input data for the signed transaction callback.
 * @returns {Promise<SignTransactionCallbackResponse>} A promise that resolves with the response from the signed transaction callback.
 * @throws {ValidationError} If the access token, session ID, or input are invalid or missing.
 * @throws {EaseSDKError} If the API call fails or returns an invalid response.
 */
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
    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { api: 'signTransactionCallback', sessionId, input });

    throw enhancedError;
  }
}
