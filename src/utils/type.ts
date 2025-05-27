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
  
  export type OptionsResp = {
    publicKey: any;
  }
  
  export type LoginResp = {
    sessionId: string;
    publicKey: LoginPublicKey
  }
  
  type LoginPublicKey = {
    challenge: string;
    timeout: number;
    rpId: string;
  }

  export type JoinResponse = {
    publicKey: any;
    sessionId: string;
  }