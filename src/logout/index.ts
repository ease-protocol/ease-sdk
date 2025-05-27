import { api } from "../api";

export const logout = async (accessToken: string): Promise<void> => {
    try {
        console.info('Logging out with access token:', accessToken);
        const responseCallback = await api(
            'https://api.ease.tech/logout',
            'POST',
            {},
            { "Authorization": `Bearer ${accessToken}` }
        );
        if (!responseCallback.success) {
            console.log('Error in logout:', responseCallback);
            throw new Error(`Error in logout: ${responseCallback.error}`);
        }
        console.log('Logout successful:', responseCallback.data);
    } catch (error) {
        console.error('Error in logout function:', error);
        throw error; // Rethrow the error to ensure the function always returns a Promise<void>
    }
}