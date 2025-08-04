import { getContacts, addContact, deleteContact, searchContacts } from '../src/contacts';
import { internalApi } from '../src/api';
import { logger, LogLevel } from '../src/utils/logger';
import { ValidationError } from '../src/utils/errors';

jest.mock('../src/api', () => ({
  internalApi: jest.fn(),
}));

const mockApi = internalApi as jest.MockedFunction<typeof internalApi>;

describe('Contacts Module', () => {
  beforeEach(() => {
    mockApi.mockClear();
    logger.configure({ level: LogLevel.DEBUG });
  });

  describe('getContacts', () => {
    it('should get contacts successfully', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', accountName: 'test', createdAt: '2025-07-28T12:00:00.000Z' }],
      };
      mockApi.mockResolvedValueOnce(mockResponse as any);

      const result = await getContacts('access-token');

      expect(result).toEqual(mockResponse.data);
      expect(mockApi).toHaveBeenCalledWith('/contacts', 'GET', null, {
        Authorization: 'Bearer access-token',
      });
    });

    it('should handle API error responses', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({ success: false, error: 'Service unavailable', statusCode: 503 });

      await expect(getContacts('access-token')).rejects.toThrow('Failed to get contacts');
    });

    it('should validate access token', async () => {
      logger.configure({ level: LogLevel.SILENT });
      await expect(getContacts('')).rejects.toThrow(ValidationError);
    });
  });

  describe('addContact', () => {
    it('should add a contact successfully', async () => {
      const mockResponse = { success: true };
      mockApi.mockResolvedValueOnce(mockResponse as any);

      const result = await addContact('access-token', 'user-id');

      expect(result).toEqual({ success: true });
      expect(mockApi).toHaveBeenCalledWith(
        '/contacts',
        'POST',
        { userId: 'user-id' },
        {
          Authorization: 'Bearer access-token',
        },
      );
    });

    it('should handle API error responses', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({ success: false, error: 'Service unavailable', statusCode: 503 });

      await expect(addContact('access-token', 'user-id')).rejects.toThrow('Failed to add contact');
    });

    it('should validate access token and user id', async () => {
      logger.configure({ level: LogLevel.SILENT });
      await expect(addContact('', 'user-id')).rejects.toThrow(ValidationError);
      await expect(addContact('access-token', '')).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteContact', () => {
    it('should delete a contact successfully', async () => {
      const mockResponse = { success: true };
      mockApi.mockResolvedValueOnce(mockResponse as any);

      const result = await deleteContact('access-token', 'contact-id');

      expect(result).toEqual({ success: true });
      expect(mockApi).toHaveBeenCalledWith('/contacts/contact-id', 'DELETE', null, {
        Authorization: 'Bearer access-token',
      });
    });

    it('should handle API error responses', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({ success: false, error: 'Service unavailable', statusCode: 503 });

      await expect(deleteContact('access-token', 'contact-id')).rejects.toThrow('Failed to delete contact');
    });

    it('should validate access token and id', async () => {
      logger.configure({ level: LogLevel.SILENT });
      await expect(deleteContact('', 'contact-id')).rejects.toThrow(ValidationError);
      await expect(deleteContact('access-token', '')).rejects.toThrow(ValidationError);
    });
  });

  describe('searchContacts', () => {
    it('should search contacts successfully', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', accountName: 'test' }],
      };
      mockApi.mockResolvedValueOnce(mockResponse as any);

      const result = await searchContacts('access-token', 'test');

      expect(result).toEqual(mockResponse.data);
      expect(mockApi).toHaveBeenCalledWith('/contacts/search?query=test', 'GET', null, {
        Authorization: 'Bearer access-token',
      });
    });

    it('should handle API error responses', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({ success: false, error: 'Service unavailable', statusCode: 503 });

      await expect(searchContacts('access-token', 'test')).rejects.toThrow('Failed to search contacts');
    });

    it('should validate access token and query', async () => {
      logger.configure({ level: LogLevel.SILENT });
      await expect(searchContacts('', 'test')).rejects.toThrow(ValidationError);
      await expect(searchContacts('access-token', '')).rejects.toThrow(ValidationError);
    });
  });
});
