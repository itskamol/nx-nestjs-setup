import { toast } from 'react-hot-toast';

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export class ErrorHandler {
  static handle(error: any): void {
    if (error.response) {
      // Server responded with error status
      const serverError = error.response.data as ApiError;
      this.handleApiError(serverError);
    } else if (error.request) {
      // Request made but no response received
      this.handleNetworkError();
    } else {
      // Something happened in setting up the request
      this.handleUnknownError();
    }
  }

  private static handleApiError(error: ApiError): void {
    switch (error.statusCode) {
      case 400:
        if (error.errors) {
          Object.values(error.errors).forEach(messages => {
            messages.forEach(message => toast.error(message));
          });
        } else {
          toast.error(error.message || 'Bad request');
        }
        break;
      case 401:
        toast.error('Unauthorized. Please login again.');
        this.handleAuthError();
        break;
      case 403:
        toast.error("You don't have permission to perform this action.");
        break;
      case 404:
        toast.error('Resource not found.');
        break;
      case 422:
        toast.error('Validation error. Please check your input.');
        break;
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(error.message || 'An error occurred');
    }
  }

  private static handleNetworkError(): void {
    toast.error('Network error. Please check your internet connection.');
  }

  private static handleUnknownError(): void {
    toast.error('An unexpected error occurred.');
  }

  private static handleAuthError(): void {
    // Clear auth tokens and redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }

  static retry<T>(fn: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> {
    return new Promise((resolve, reject) => {
      let retries = 0;

      const attempt = () => {
        fn()
          .then(resolve)
          .catch(error => {
            retries++;
            if (retries >= maxRetries) {
              reject(error);
            } else {
              setTimeout(attempt, delay * retries);
            }
          });
      };

      attempt();
    });
  }
}
