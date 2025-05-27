import { api } from "../api";
import { APIDefaultResponse, JoinResponse, OptionsResp } from "../utils/type";

export const join = async (accessToken: string): Promise<JoinResponse> => {
    try {
        const response = await api<OptionsResp>('https://api.ease.tech/join/options', 'POST', {}, {
            'Authorization': `Bearer ${accessToken}`,
          });
        
        if (!response.success) {
            console.log('Error creating passkey:', response);
            throw new Error(`Error creating passkey ${response.error}`);
        }

        const { publicKey } = response.data!;
        const sessionId = response.headers?.get('X-Session-Id');

        return {
            publicKey,
            sessionId: sessionId || '',
        };
    } catch (error) {
        console.error('Error in join function:', error);
        throw error; // Rethrow the error to ensure the function always returns a Promise<JoinResponse>
    }
}

export const joinCallback = async (publicKey: any, accessToken: string, sessionId: string): Promise<APIDefaultResponse> => {
    try {
        const responseCallback = await api<APIDefaultResponse>('https://api.ease.tech/join/callback', 'POST', {
            publicKey
          }, {
            'Authorization': `Bearer ${accessToken}`,
            'X-Session-Id': sessionId,
          });

          if(!responseCallback.success) {
            console.log('Error creating passkey:', responseCallback);
            throw new Error(`Error creating passkey ${responseCallback.error}`);
          }
          
          const { accessToken: newAccessToken, refreshToken } = responseCallback.data!;
          
          console.log('New Access Token:', newAccessToken);
          console.log('New Refresh Token:', refreshToken);
          
          return {
            success: true,
            accessToken: newAccessToken,
            refreshToken: refreshToken,
          };
        
    } catch (error) {
        console.error('Error in joinCallback function:', error);
        throw error; // Rethrow the error to ensure the function always returns a Promise<JoinResponse>
    }
    
}