import { refreshToken } from '../src/refresh';
import { api } from '../src/api';
import { AuthenticationError, ValidationError } from '../src/utils/errors';

jest.mock('../src/api');
const mockApi = api as jest.MockedFunction<typeof api>;

describe('refreshToken', () => {
  beforeEach(() => {
    mockApi.mockClear();
  });

  it('should refresh the token successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    };
    mockApi.mockResolvedValueOnce(mockResponse);

    const result = await refreshToken('old-refresh-token');

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(mockApi).toHaveBeenCalledWith(
      '/refresh',
      'POST',
      null,
      { Authorization: 'Bearer old-refresh-token' },
      false,
    );
  });

  it('should throw a ValidationError if the refresh token is missing', async () => {
    await expect(refreshToken('')).rejects.toThrow(ValidationError);
    await expect(refreshToken(null as any)).rejects.toThrow(ValidationError);
  });

  it('should throw an AuthenticationError if the API returns an error', async () => {
    mockApi.mockResolvedValueOnce({
      success: false,
      error: 'Invalid refresh token',
      statusCode: 401,
    });

    await expect(refreshToken('invalid-refresh-token')).rejects.toThrow(AuthenticationError);
  });

  it('should throw an AuthenticationError if the response is missing tokens', async () => {
    mockApi.mockResolvedValueOnce({
      success: true,
      data: {},
    });

    await expect(refreshToken('old-refresh-token')).rejects.toThrow(AuthenticationError);
  });

  it('should throw an AuthenticationError for unexpected errors', async () => {
    mockApi.mockRejectedValueOnce(new Error('Network error'));

    await expect(refreshToken('old-refresh-token')).rejects.toThrow(AuthenticationError);
  });
});
