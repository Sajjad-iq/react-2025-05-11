import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Create axios instance with base configuration
export const apiClient = axios.create({
    baseURL: 'https://api.github.com',
    timeout: 10000,
    headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`
    },
});

// Request interceptor for adding auth tokens, logging, etc.
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Add GitHub token if available
        const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
        if (token) {
            config.headers.Authorization = `token ${token}`;
        }

        // Log request in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error: AxiosError) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        // Log successful response in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        }

        return response;
    },
    (error: AxiosError) => {
        // Enhanced error logging
        if (error.response) {
            // Server responded with error status
            console.error(`❌ API Error: ${error.response.status} ${error.response.statusText}`);
            console.error('Error data:', error.response.data);

            // Handle specific GitHub API errors
            if (error.response.status === 403) {
                console.warn('GitHub API rate limit exceeded or authentication required');
            } else if (error.response.status === 404) {
                console.warn('Repository or resource not found');
            }
        } else if (error.request) {
            // Network error
            console.error('Network error:', error.message);
        } else {
            // Other error
            console.error('Request setup error:', error.message);
        }

        return Promise.reject(error);
    }
);

// Retry logic for failed requests
export const retryRequest = async <T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error) {
            const axiosError = error as AxiosError;

            // Don't retry on client errors (4xx) except for rate limiting
            if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
                if (axiosError.response.status !== 429) { // 429 is rate limit, should retry
                    throw error;
                }
            }

            if (attempt === maxRetries) {
                console.error(`Request failed after ${maxRetries} attempts`);
                throw error;
            }

            // Exponential backoff delay
            const backoffDelay = delay * Math.pow(2, attempt - 1);
            console.warn(`Request attempt ${attempt} failed, retrying in ${backoffDelay}ms...`);

            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected error in retry logic');
};


export default apiClient; 