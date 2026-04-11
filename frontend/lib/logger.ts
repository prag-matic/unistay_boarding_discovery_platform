/**
 * Centralized logger utility for UniStay frontend.
 *
 * - `debug` and `info` messages are only emitted in development (`__DEV__`).
 * - `warn` and `error` messages are always emitted.
 * - Each entry includes an ISO timestamp, level, namespace, and an optional payload.
 */

// __DEV__ is a global boolean provided by the Expo / Metro bundler at runtime.
// The declaration below satisfies TypeScript when Expo's ambient typings are not
// yet available (e.g. before `node_modules` is installed).
declare const __DEV__: boolean;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogPayload = Record<string, unknown> | unknown[] | string | number | null | undefined;

/** Sensitive keys whose values are redacted in log output. */
const SENSITIVE_KEYS = new Set([
  'password',
  'confirmPassword',
  'newPassword',
  'oldPassword',
  'accessToken',
  'refreshToken',
  'token',
  'Authorization',
  'authorization',
]);

/**
 * Recursively redact sensitive keys from an object so they are never printed
 * to the console (e.g. passwords / auth tokens passed as request bodies).
 */
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    sanitized[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : sanitize(val, depth + 1);
  }
  return sanitized;
}

function log(level: LogLevel, namespace: string, message: string, payload?: LogPayload): void {
  const isVerbose = level === 'debug' || level === 'info';

  // In production, skip debug/info entirely.
  if (isVerbose && !__DEV__) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${namespace}]`;

  const sanitizedPayload = payload !== undefined ? sanitize(payload) : undefined;

  switch (level) {
    case 'debug':
      sanitizedPayload !== undefined
        ? console.debug(prefix, message, sanitizedPayload)
        : console.debug(prefix, message);
      break;
    case 'info':
      sanitizedPayload !== undefined
        ? console.info(prefix, message, sanitizedPayload)
        : console.info(prefix, message);
      break;
    case 'warn':
      sanitizedPayload !== undefined
        ? console.warn(prefix, message, sanitizedPayload)
        : console.warn(prefix, message);
      break;
    case 'error':
      sanitizedPayload !== undefined
        ? console.error(prefix, message, sanitizedPayload)
        : console.error(prefix, message);
      break;
  }
}

function createNamespacedLogger(namespace: string) {
  return {
    debug: (message: string, payload?: LogPayload) => log('debug', namespace, message, payload),
    info: (message: string, payload?: LogPayload) => log('info', namespace, message, payload),
    warn: (message: string, payload?: LogPayload) => log('warn', namespace, message, payload),
    error: (message: string, payload?: LogPayload) => log('error', namespace, message, payload),
  };
}

const logger = {
  /** Logs related to Axios HTTP request/response lifecycle. */
  api: createNamespacedLogger('API'),
  /** Logs related to authentication flows. */
  auth: createNamespacedLogger('AUTH'),
  /** Logs related to boarding operations. */
  boarding: createNamespacedLogger('BOARDING'),
  /** Logs related to marketplace operations. */
  marketplace: createNamespacedLogger('MARKETPLACE'),
  /** Logs related to payment operations. */
  payment: createNamespacedLogger('PAYMENT'),
  /** Logs related to reservation operations. */
  reservation: createNamespacedLogger('RESERVATION'),
  /** Logs related to review operations. */
  review: createNamespacedLogger('REVIEW'),
  /** Logs related to visit request operations. */
  visit: createNamespacedLogger('VISIT'),
  /** Logs related to chat operations. */
  chat: createNamespacedLogger('CHAT'),
  /** Logs related to saved boardings. */
  savedBoarding: createNamespacedLogger('SAVED_BOARDING'),
  /** Logs related to Zustand store actions. */
  store: createNamespacedLogger('STORE'),
};

export { sanitize };
export default logger;
