export enum ErrorCode {
  // Network/API errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Phone/OTP errors
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  INVALID_OTP = 'INVALID_OTP',
  OTP_EXPIRED = 'OTP_EXPIRED',
  OTP_SEND_FAILED = 'OTP_SEND_FAILED',
  OTP_VERIFY_FAILED = 'OTP_VERIFY_FAILED',
  
  // WebAuthn/Passkey errors
  WEBAUTHN_NOT_SUPPORTED = 'WEBAUTHN_NOT_SUPPORTED',
  PASSKEY_CREATION_FAILED = 'PASSKEY_CREATION_FAILED',
  PASSKEY_AUTHENTICATION_FAILED = 'PASSKEY_AUTHENTICATION_FAILED',
  USER_CANCELLED = 'USER_CANCELLED',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  cause?: Error;
  context?: Record<string, any>;
  timestamp?: Date;
}

export class EaseSDKError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode?: number;
  public readonly cause?: Error;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'EaseSDKError';
    this.code = details.code;
    this.statusCode = details.statusCode;
    this.cause = details.cause;
    this.context = details.context;
    this.timestamp = details.timestamp || new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EaseSDKError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

export class NetworkError extends EaseSDKError {
  constructor(message: string, cause?: Error, context?: Record<string, any>) {
    super({
      code: ErrorCode.NETWORK_ERROR,
      message,
      cause,
      context,
    });
    this.name = 'NetworkError';
  }
}

export class APIError extends EaseSDKError {
  constructor(
    message: string,
    statusCode?: number,
    cause?: Error,
    context?: Record<string, any>
  ) {
    super({
      code: ErrorCode.API_ERROR,
      message,
      statusCode,
      cause,
      context,
    });
    this.name = 'APIError';
  }
}

export class AuthenticationError extends EaseSDKError {
  constructor(message: string, code: ErrorCode = ErrorCode.AUTHENTICATION_FAILED, context?: Record<string, any>) {
    super({
      code,
      message,
      statusCode: 401,
      context,
    });
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends EaseSDKError {
  constructor(message: string, field?: string, value?: any) {
    super({
      code: ErrorCode.INVALID_INPUT,
      message,
      statusCode: 400,
      context: { field, value },
    });
    this.name = 'ValidationError';
  }
}

export class OTPError extends EaseSDKError {
  constructor(message: string, code: ErrorCode = ErrorCode.OTP_VERIFY_FAILED, context?: Record<string, any>) {
    super({
      code,
      message,
      statusCode: 400,
      context,
    });
    this.name = 'OTPError';
  }
}

export class WebAuthnError extends EaseSDKError {
  constructor(message: string, code: ErrorCode = ErrorCode.PASSKEY_CREATION_FAILED, context?: Record<string, any>) {
    super({
      code,
      message,
      statusCode: 400,
      context,
    });
    this.name = 'WebAuthnError';
  }
}

// Error mapping utilities
export function mapHTTPStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.INVALID_INPUT;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.AUTHENTICATION_FAILED;
    case 404:
      return ErrorCode.API_ERROR;
    case 408:
      return ErrorCode.TIMEOUT_ERROR;
    case 429:
      return ErrorCode.RATE_LIMIT_ERROR;
    case 500:
    case 502:
    case 503:
      return ErrorCode.SERVICE_UNAVAILABLE;
    case 504:
      return ErrorCode.TIMEOUT_ERROR;
    default:
      return ErrorCode.API_ERROR;
  }
}

export function createErrorFromAPIResponse(
  statusCode: number,
  responseData: any,
  context?: Record<string, any>
): EaseSDKError {
  const errorCode = mapHTTPStatusToErrorCode(statusCode);
  const message = responseData?.error || responseData?.message || `HTTP ${statusCode} error`;
  
  return new EaseSDKError({
    code: errorCode,
    message,
    statusCode,
    context: {
      ...context,
      responseData,
    },
  });
}

export function isEaseSDKError(error: any): error is EaseSDKError {
  return error instanceof EaseSDKError;
}

export function handleUnknownError(error: unknown, context?: Record<string, any>): EaseSDKError {
  if (isEaseSDKError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new EaseSDKError({
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message,
      cause: error,
      context,
    });
  }

  return new EaseSDKError({
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'An unknown error occurred',
    context: {
      ...context,
      originalError: error,
    },
  });
}