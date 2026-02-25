/**
 * Sanitize user object by removing sensitive fields
 * @param user - User object
 * @returns User object without sensitive data
 */
export const sanitizeUser = <T extends Record<string, unknown>>(
  user: T,
): Omit<T, "password"> => {
  const { password, ...sanitized } = user as T & { password?: string };
  return sanitized;
};

/**
 * Generate a random string (for tokens, IDs, etc.)
 * @param length - Length of the string
 * @returns Random string
 */
export const generateRandomString = (length: number = 32): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (basic validation)
 * @param phone - Phone number to validate
 * @returns True if valid phone
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Format date to ISO string
 * @param date - Date to format
 * @returns ISO formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString();
};

/**
 * Calculate pagination metadata
 * @param page - Current page
 * @param limit - Items per page
 * @param total - Total items
 * @returns Pagination object
 */
export const calculatePagination = (
  page: number = 1,
  limit: number = 10,
  total: number,
) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
  };
};

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns True if date is in the past
 */
export const isPastDate = (date: Date): boolean => {
  return date.getTime() < Date.now();
};

/**
 * Check if a date is in the future
 * @param date - Date to check
 * @returns True if date is in the future
 */
export const isFutureDate = (date: Date): boolean => {
  return date.getTime() > Date.now();
};
