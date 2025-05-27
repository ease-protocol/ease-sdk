import { api } from "../api";
import { APIDefaultResponse, SendOtpResp } from "../utils/type";

export const sendOtp = async (countryCode: string, phone: string): Promise<{success: boolean}> => {
    try {
        const response = await api<SendOtpResp>(`https://api.ease.tech/phone/send-otp`, 'POST', {
            countryCode,
            phone,
        });
        if (!response.success) {
            console.log('Error sending OTP:', response);
            throw new Error(`Error sending OTP: ${response.error}`);
        }
        
        console.log('OTP sent successfully:', response.data!.success);

        return { success: response.data!.success };
    } catch (error) {
        console.error('Error in sendOtp function:', error);
        throw error; // Rethrow the error to ensure the function always returns a Promise<JoinResponse> 
    }
}

export const verifyOtp = async (
    countryCode: string,
    phone: string,
    otpCode: string,
    chainID: string = '0001', // hardcoded for now since we haven't implemented chain selection neither chainIds in the backend.
): Promise<APIDefaultResponse> => {
    console.log('Verifying OTP:', { countryCode, phone, otpCode, chainID });
    try {
        const response = await api<APIDefaultResponse>('https://api.ease.tech/phone/verify-otp', 'POST', {
            countryCode,
            phone,
            otpCode: otpCode,
            chainID
        });

        if (!response.success) {
            console.log('Error verifying OTP:', response);
            throw new Error(`Error verifying OTP: ${response.error}`);
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
        console.error('Error in verifyOtp function:', error);
        throw error; // Rethrow the error to ensure the function always returns a Promise<JoinResponse> 
    }
}