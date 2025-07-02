import { api } from '../api';
import {
  Address,
  CreateKeysInput,
  CreateKeysResponse,
  CreateTransactionResponse,
  RecipientData,
  SignTransactionOptionsResponse,
  TransactionIntent,
} from '../utils/type';
import { logger } from '../utils/logger';
import { EaseSDKError, ErrorCode, handleUnknownError } from '../utils/errors';

// get addresses
export async function getAddresses(): Promise<Address[]> {
  try {
    logger.debug('Attempting to fetch addresses.');
    const res = await api<Address[]>('/transaction/keys/addresses', 'GET');
    if (!res.success || !res.data) {
      logger.error('Failed to fetch addresses.', res.errorDetails || res.error);
      throw (
        res.errorDetails ||
        new EaseSDKError({ code: ErrorCode.API_ERROR, message: res.error || 'Unknown error fetching addresses' })
      );
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

export async function createKeys(input: CreateKeysInput): Promise<CreateKeysResponse> {
  try {
    logger.debug('Attempting to create keys.', input);
    const res = await api<CreateKeysResponse>(`/transaction/keys/create`, 'POST', input);
    if (!res.success || !res.data) {
      logger.error('Failed to create keys.', res.errorDetails || res.error);
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

export async function createTransaction(intent: TransactionIntent): Promise<CreateTransactionResponse> {
  try {
    logger.debug('Attempting to create transaction.', intent);
    const res = await api<CreateTransactionResponse>('/transaction/create', 'POST', intent);
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

export async function signTransactionOptions(): Promise<SignTransactionOptionsResponse> {
  try {
    logger.debug('Attempting to get sign transaction options.');
    const res = await api<SignTransactionOptionsResponse>('/transaction/sign/options', 'POST');
    if (!res.success || !res.data) {
      logger.error('Failed to get sign transaction options.', res.errorDetails || res.error);
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
    }
    logger.info('Successfully retrieved sign transaction options.');
    return res.data;
  } catch (error) {
    throw handleUnknownError(error, { api: 'signTransactionOptions' });
  }
}

// sign transaction callback
export type SignTransactionCallbackInput = {
  response: any;
  coin: string;
  recipientData: RecipientData<{ transaction: any; params: any }>;
};
export type SignTransactionCallbackResponse = {
  coin: string;
  response: any;
};

export async function signTransactionCallback(
  sessionId: string,
  input: SignTransactionCallbackInput,
): Promise<SignTransactionCallbackResponse> {
  try {
    logger.debug('Attempting to sign transaction callback.', { sessionId, input });
    const res = await api<SignTransactionCallbackResponse>(`/transaction/sign/callback`, 'POST', input, {
      'X-Session-Id': sessionId,
    });
    if (!res.success || !res.data) {
      logger.error('Failed to sign transaction callback.', res.errorDetails || res.error);
      throw (
        res.errorDetails ||
        new EaseSDKError({
          code: ErrorCode.API_ERROR,
          message: res.error || 'Unknown error signing transaction callback',
        })
      );
    }
    logger.info('Successfully signed transaction callback.');
    return res.data;
  } catch (error) {
    throw handleUnknownError(error, { api: 'signTransactionCallback', sessionId, input });
  }
}
