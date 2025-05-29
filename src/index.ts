import * as join from "./join";
import * as phone from "./phone";
import * as login from "./login";
import * as logout from "./logout";

export { join, phone, login, logout };

// Re-export logger, errors, and types for convenience
export { logger, LogLevel } from "./utils/logger";
export type { LoggerConfig } from "./utils/logger";

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
  handleUnknownError
} from "./utils/errors";
export type { ErrorDetails } from "./utils/errors";

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
  JoinResponse
} from "./utils/type";



