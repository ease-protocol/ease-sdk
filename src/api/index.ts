export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  headers?: Headers;
};

export const api = async <T>(url: string, method: string, body: any = null, headers: Record<string, string> | undefined = undefined): Promise<ApiResponse<T>> => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
    };

    if (body !== null && method !== 'GET' && method !== 'HEAD') {
      const bodyString = JSON.stringify( path.includes("callback") ? { response: body.publicKey ?? body } : body);
      
      options.body = bodyString
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.log('Error response:', JSON.stringify(errorData));
      } catch (jsonError) {
        // If JSON parsing fails, use the raw response text
        console.error('Error parsing JSON:', JSON.stringify(jsonError));
        errorData = {error: `An error occurred while processing the response ${jsonError}`};
      }

      return {
        success: false,
        error: errorData.error || 'An error occurred',
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
      headers: response.headers
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error connecting to the server',
    };
  }
};
