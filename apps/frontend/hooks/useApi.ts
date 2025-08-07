import { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status?: number;
}

interface UseApiOptions {
  retries?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    retries = 3,
    retryDelay = 1000,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage = 'Operation successful',
  } = options;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const request = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      customOptions: Partial<UseApiOptions> = {}
    ): Promise<ApiResponse<T>> => {
      const mergedOptions = { ...options, ...customOptions };
      const finalRetries = mergedOptions.retries ?? retries;
      const finalRetryDelay = mergedOptions.retryDelay ?? retryDelay;
      const finalShowErrorToast = mergedOptions.showErrorToast ?? showErrorToast;
      const finalShowSuccessToast = mergedOptions.showSuccessToast ?? showSuccessToast;
      const finalSuccessMessage = mergedOptions.successMessage ?? successMessage;

      setLoading(true);
      setError(null);

      let lastError: any = null;

      for (let attempt = 1; attempt <= finalRetries + 1; attempt++) {
        try {
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              ...options.headers,
            },
            ...options,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;

            // Don't retry on authentication errors
            if (response.status === 401 || response.status === 403) {
              throw new Error(errorMessage);
            }

            // Don't retry on client errors (4xx) except for rate limiting
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
              throw new Error(errorMessage);
            }

            throw new Error(errorMessage);
          }

          const data = await response.json();

          if (finalShowSuccessToast) {
            toast.success(finalSuccessMessage);
          }

          return { data, status: response.status };
        } catch (err: any) {
          lastError = err;

          if (attempt <= finalRetries) {
            // Exponential backoff
            const delayTime = finalRetryDelay * Math.pow(2, attempt - 1);
            console.warn(`Attempt ${attempt} failed, retrying in ${delayTime}ms:`, err.message);
            await delay(delayTime);
          } else {
            const errorMessage = err.message || 'An error occurred';
            setError(errorMessage);

            if (finalShowErrorToast) {
              // Categorize errors for better user messages
              let userMessage = errorMessage;
              if (
                err.message.includes('Network Error') ||
                err.message.includes('Failed to fetch')
              ) {
                userMessage = 'Network error. Please check your connection.';
              } else if (err.message.includes('401')) {
                userMessage = 'Authentication failed. Please log in again.';
              } else if (err.message.includes('403')) {
                userMessage = 'Access denied. You do not have permission.';
              } else if (err.message.includes('404')) {
                userMessage = 'Resource not found.';
              } else if (err.message.includes('500')) {
                userMessage = 'Server error. Please try again later.';
              } else if (err.message.includes('429')) {
                userMessage = 'Too many requests. Please wait a moment.';
              }

              toast.error(userMessage);
            }

            return { error: errorMessage, status: err.status };
          }
        } finally {
          if (attempt === finalRetries + 1) {
            setLoading(false);
          }
        }
      }

      return { error: lastError?.message || 'Unknown error' };
    },
    [retries, retryDelay, showErrorToast, showSuccessToast, successMessage]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    request,
    clearError,
    retry: (url: string, options?: RequestInit) => request(url, options, { retries: retries + 1 }),
  };
}
