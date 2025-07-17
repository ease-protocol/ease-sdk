export interface GoogleOAuthURLResponse {
  success: boolean;
  authURL: string;
}

export interface GoogleOAuthCallbackRequest {
  code: string;
  state: string;
  chainID: string;
}

export interface GoogleOAuthCallbackResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
}
