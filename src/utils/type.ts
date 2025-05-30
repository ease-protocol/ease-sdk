export type APIDefaultResponse = {
    success: boolean;
    accessToken: string;
    refreshToken: string;
  };
  export type SendOtpResp = {
    success: boolean;
  };
  
  export type Country = {
    code: string;
    name: string;
    dial_code: string;
  };

  // WebAuthn Base Types
  export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal';
  
  export type COSEAlgorithmIdentifier = number;
  
  export type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged';
  
  export type AttestationConveyancePreference = 'none' | 'indirect' | 'direct' | 'enterprise';
  
  export type AuthenticatorAttachment = 'platform' | 'cross-platform';
  
  export type ResidentKeyRequirement = 'discouraged' | 'preferred' | 'required';

  // WebAuthn Credential Descriptors
  export interface PublicKeyCredentialDescriptor {
    type: 'public-key';
    id: ArrayBuffer | string;
    transports?: AuthenticatorTransport[];
  }

  // WebAuthn User Entity
  export interface PublicKeyCredentialUserEntity {
    id: ArrayBuffer | string;
    name: string;
    displayName: string;
  }

  // WebAuthn RP Entity
  export interface PublicKeyCredentialRpEntity {
    id?: string;
    name: string;
  }

  // WebAuthn Algorithm Parameters
  export interface PublicKeyCredentialParameters {
    type: 'public-key';
    alg: COSEAlgorithmIdentifier;
  }

  // WebAuthn Authenticator Selection
  export interface AuthenticatorSelectionCriteria {
    authenticatorAttachment?: AuthenticatorAttachment;
    requireResidentKey?: boolean;
    residentKey?: ResidentKeyRequirement;
    userVerification?: UserVerificationRequirement;
  }

  // WebAuthn Registration Options (for join/registration)
  export interface PublicKeyCredentialCreationOptions {
    rp: PublicKeyCredentialRpEntity;
    user: PublicKeyCredentialUserEntity;
    challenge: ArrayBuffer | string;
    pubKeyCredParams: PublicKeyCredentialParameters[];
    timeout?: number;
    excludeCredentials?: PublicKeyCredentialDescriptor[];
    authenticatorSelection?: AuthenticatorSelectionCriteria;
    attestation?: AttestationConveyancePreference;
    extensions?: Record<string, any>;
  }

  // WebAuthn Authentication Options (for login)
  export interface PublicKeyCredentialRequestOptions {
    challenge: ArrayBuffer | string;
    timeout?: number;
    rpId?: string;
    allowCredentials?: PublicKeyCredentialDescriptor[];
    userVerification?: UserVerificationRequirement;
    extensions?: Record<string, any>;
  }

  // WebAuthn Response Types
  export interface AuthenticatorResponse {
    clientDataJSON: ArrayBuffer | string;
  }

  export interface AuthenticatorAttestationResponse extends AuthenticatorResponse {
    attestationObject: ArrayBuffer | string;
    transports?: AuthenticatorTransport[];
  }

  export interface AuthenticatorAssertionResponse extends AuthenticatorResponse {
    authenticatorData: ArrayBuffer | string;
    signature: ArrayBuffer | string;
    userHandle?: ArrayBuffer | string | null;
  }

  // Credential Response Types
  export interface PublicKeyCredential {
    id: string;
    rawId: ArrayBuffer | string;
    response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse;
    type: 'public-key';
    clientExtensionResults?: Record<string, any>;
  }

  // Updated API Response Types
  export type OptionsResp = {
    publicKey: PublicKeyCredentialCreationOptions;
  }
  
  export type LoginResp = {
    sessionId: string;
    publicKey: PublicKeyCredentialRequestOptions;
  }

  export type JoinResponse = {
    publicKey: PublicKeyCredentialCreationOptions;
    sessionId: string;
  }