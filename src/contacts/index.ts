import { internalApi } from '../api';
import { logger } from '../utils/logger';
import { handleUnknownError, isEaseSDKError, ValidationError } from '../utils/errors';
import { Contact, SearchUser } from '../utils/type';

/**
 * Retrieves all contacts for the authenticated user.
 *
 * @param {string} accessToken The access token for authorization.
 * @returns {Promise<Contact[]>} A promise that resolves with an array of contact objects.
 * @throws {ValidationError} If the access token is missing or invalid.
 * @throws {Error} If the API call fails or returns an unsuccessful response.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function getContacts(accessToken: string): Promise<Contact[]> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }

  try {
    const response = await internalApi<Contact[]>('/contacts', 'GET', null, {
      Authorization: `Bearer ${accessToken.trim()}`,
    });

    if (!response.success || !response.data) {
      throw new Error('Failed to get contacts');
    }

    return response.data;
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }
    const enhancedError = handleUnknownError(error, {
      operation: 'getContacts',
    });
    logger.error('Unexpected error in getContacts:', enhancedError);
    throw enhancedError;
  }
}

/**
 * Adds a new contact for the authenticated user.
 *
 * @param {string} accessToken The access token for authorization.
 * @param {string} userId The ID of the user to add as a contact.
 * @returns {Promise<{ success: boolean }>} A promise that resolves with a success indicator.
 * @throws {ValidationError} If the access token or user ID are missing or invalid.
 * @throws {Error} If the API call fails or returns an unsuccessful response.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function addContact(accessToken: string, userId: string): Promise<{ success: boolean }> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }
  if (!userId || typeof userId !== 'string') {
    throw new ValidationError('User ID is required and must be a string', 'userId', userId);
  }

  try {
    const response = await internalApi<{ success: boolean }>(
      '/contacts',
      'POST',
      { userId },
      {
        Authorization: `Bearer ${accessToken.trim()}`,
      },
    );

    if (!response.success) {
      throw new Error('Failed to add contact');
    }

    return { success: true };
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }
    const enhancedError = handleUnknownError(error, {
      operation: 'addContact',
    });
    logger.error('Unexpected error in addContact:', enhancedError);
    throw enhancedError;
  }
}

/**
 * Deletes a contact for the authenticated user.
 *
 * @param {string} accessToken The access token for authorization.
 * @param {string} id The ID of the contact to delete.
 * @returns {Promise<{ success: boolean }>} A promise that resolves with a success indicator.
 * @throws {ValidationError} If the access token or contact ID are missing or invalid.
 * @throws {Error} If the API call fails or returns an unsuccessful response.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function deleteContact(accessToken: string, id: string): Promise<{ success: boolean }> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }
  if (!id || typeof id !== 'string') {
    throw new ValidationError('ID is required and must be a string', 'id', id);
  }

  try {
    const response = await internalApi<{ success: boolean }>(`/contacts/${id}`, 'DELETE', null, {
      Authorization: `Bearer ${accessToken.trim()}`,
    });

    if (!response.success) {
      throw new Error('Failed to delete contact');
    }

    return { success: true };
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }
    const enhancedError = handleUnknownError(error, {
      operation: 'deleteContact',
    });
    logger.error('Unexpected error in deleteContact:', enhancedError);
    throw enhancedError;
  }
}

/**
 * Searches for users based on a query string.
 *
 * @param {string} accessToken The access token for authorization.
 * @param {string} query The search query string.
 * @returns {Promise<SearchUser[]>} A promise that resolves with an array of matching user objects.
 * @throws {ValidationError} If the access token or query are missing or invalid.
 * @throws {Error} If the API call fails or returns an unsuccessful response.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function searchContacts(accessToken: string, query: string): Promise<SearchUser[]> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }
  if (!query || typeof query !== 'string') {
    throw new ValidationError('Query is required and must be a string', 'query', query);
  }

  try {
    const response = await internalApi<SearchUser[]>(`/contacts/search?query=${query}`, 'GET', null, {
      Authorization: `Bearer ${accessToken.trim()}`,
    });

    if (!response.success || !response.data) {
      throw new Error('Failed to search contacts');
    }

    return response.data;
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }
    const enhancedError = handleUnknownError(error, {
      operation: 'searchContacts',
    });
    logger.error('Unexpected error in searchContacts:', enhancedError);
    throw enhancedError;
  }
}
