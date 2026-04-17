import axios from 'axios';

export function formatCurrency(amount: number, currency = 'LKR'): string {
  return `${currency} ${amount.toLocaleString()}`;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type ErrorDetails = Array<{ field?: string; message?: string }>;

function extractErrorMessageFromResponseData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const payload = data as {
    message?: unknown;
    error?: unknown;
    details?: unknown;
  };

  if (Array.isArray(payload.details) && payload.details.length > 0) {
    const messages = (payload.details as ErrorDetails)
      .map((detail) => detail?.message)
      .filter((message): message is string => typeof message === 'string' && message.trim().length > 0);

    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }

  if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
    return payload.error;
  }

  return null;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = extractErrorMessageFromResponseData(error.response?.data);
    if (responseMessage) {
      return responseMessage;
    }

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }

    if (!error.response) {
      return 'Unable to reach the server. Please check your connection.';
    }

    return `Request failed with status ${error.response.status}`;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
      return maybeError.message;
    }
  }

  if (typeof error === 'string' && error.trim().length > 0) return error;

  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
