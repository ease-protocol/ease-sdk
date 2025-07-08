import { telemetry } from './telemetry';

export * from './join';
export * from './phone';
export * from './login';
export * from './logout';
export * from './wallet';
export * from './enclave';
export * from './transaction';
export * from './refresh';

// Re-export logger, errors, and types for convenience
export { logger, LogLevel } from './utils/logger';
export type { LoggerConfig } from './utils/logger';

export {
  EaseSDKError,
  NetworkError,
  APIError,
  AuthenticationError,
  ValidationError,
  OTPError,
  WebAuthnError,
  ErrorCode,
  isEaseSDKError,
  handleUnknownError,
} from './utils/errors';
export type { ErrorDetails } from './utils/errors';

export type {
  APIDefaultResponse,
  SendOtpResp,
  Country,
  AuthenticatorTransport,
  COSEAlgorithmIdentifier,
  UserVerificationRequirement,
  AttestationConveyancePreference,
  AuthenticatorAttachment,
  ResidentKeyRequirement,
  PublicKeyCredentialDescriptor,
  PublicKeyCredentialUserEntity,
  PublicKeyCredentialRpEntity,
  PublicKeyCredentialParameters,
  AuthenticatorSelectionCriteria,
  PublicKeyCredentialCreationOptions,
  PublicKeyCredentialRequestOptions,
  AuthenticatorResponse,
  AuthenticatorAttestationResponse,
  AuthenticatorAssertionResponse,
  PublicKeyCredential,
  OptionsResp,
  LoginResp,
  JoinResponse,
  AttestationDocument,
  Transaction,
  GetAttestationResponse,
  Address,
  CreateKeysInput,
  CreateKeysResponse,
  RecipientData,
  CreateTransactionResponse,
  TransactionIntent,
  SignTransactionOptionsResponse,
  SignTransactionCallbackInput,
  SignTransactionCallbackResponse,
} from './utils/type';

export interface EaseSDKConfig {
  telemetryEnabled?: boolean;
  sentryDsn?: string;
  environment?: string;
  release?: string;
  packageVersion?: string;
  phoneConfig?: {
    countryCode: string;
    phoneNumber: string;
    platform: 'ios' | 'android' | 'web';
    uuid?: string;
  };
}

export function initTelemetry(config: EaseSDKConfig) {
  telemetry.init({
    enabled: config.telemetryEnabled,
    sentryDsn: config.sentryDsn,
    environment: config.environment,
    release: config.release,
    packageVersion: config.packageVersion,
    phoneConfig: config.phoneConfig,
  });
}
