import { api } from "../api";
import { APIDefaultResponse, LoginResp } from "../utils/type"

export const login = async (): Promise<LoginResp> => {
    try {
        const response = await api<LoginResp>(
            'https://api.ease.tech/login/options',
            'POST'
        );

        if (!response.success) {
            console.log('Error in login:', response);
            throw new Error(`Error in login: ${response.error}`);
        }

        const sessionId = response.headers?.get("X-Session-Id");

        if (!sessionId) {
            console.log('Error: Session ID not found.');
            throw new Error('Session ID not found.');
        }
        console.log('Session ID:', sessionId);

        return {
            sessionId,
            publicKey: response.data!.publicKey
        }

    } catch (error) {
        console.error('Error in login function:', error);
        throw error; // Rethrow the error to ensure the function always returns a Promise<JoinResponse>
    }
}

export const loginCallback = async (passkeyData: any, sessionId: string): Promise<APIDefaultResponse> => {
    try {
        const response = await api<APIDefaultResponse>(
            'https://api.ease.tech/login/callback',
            'POST',
            { ...passkeyData },
            { "X-Session-Id": sessionId }
        );

        if (!response.success) {
            console.log('Error in loginCallback:', response);
            throw new Error(`Error in loginCallback: ${response.error}`);
        }
        const { accessToken, refreshToken } = response.data!;
        console.log('Access Token:', accessToken);
        console.log('Refresh Token:', refreshToken);
        return {
            success: true,
            accessToken: accessToken,
            refreshToken: refreshToken,
        };
    } catch (error) {
        console.error('Error in loginCallback function:', error);
        throw error; // Rethrow the error to ensure the function always returns a Promise<JoinResponse>
    }
}
