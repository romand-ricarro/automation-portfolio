/**
 * Error categorization and handling utilities for Relay
 */

export type ErrorCategory =
  | 'auth'           // Authentication/authorization errors (401, 403)
  | 'whitelist'      // Whitelist/access denied errors
  | 'network'        // Network connectivity issues
  | 'rate_limit'     // Rate limiting (429)
  | 'server'         // Server errors (5xx)
  | 'validation'     // Form validation errors
  | 'jira'           // Jira API specific errors
  | 'unknown';       // Uncategorized errors

export interface CategorizedError {
  category: ErrorCategory;
  title: string;
  message: string;
  technicalDetails?: string;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number;  // seconds
  actions?: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  action: 'retry' | 'copy' | 'dismiss' | 'navigate' | 'custom';
  data?: string;
  onClick?: () => void;
}

// Toast duration rules based on error category
export const ERROR_DURATIONS: Record<ErrorCategory, number> = {
  auth: 0,          // Never auto-dismiss (critical)
  whitelist: 0,     // Never auto-dismiss (critical)
  network: 10000,   // 10 seconds
  rate_limit: 0,    // Never auto-dismiss (show countdown)
  server: 10000,    // 10 seconds
  validation: 5000, // 5 seconds
  jira: 10000,      // 10 seconds
  unknown: 5000,    // 5 seconds
};

// Success toast duration
export const SUCCESS_DURATION = 3000;  // 3 seconds
export const INFO_DURATION = 5000;     // 5 seconds

/**
 * Categorize an error based on its properties
 */
export function categorizeError(
  error: Error | unknown,
  statusCode?: number
): CategorizedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for whitelist/authorization errors first
  if (
    lowerMessage.includes('not authorized') ||
    lowerMessage.includes('whitelist') ||
    lowerMessage.includes('not allowed') ||
    lowerMessage.includes('access denied')
  ) {
    return {
      category: 'whitelist',
      title: 'Access Denied',
      message: errorMessage,
      statusCode,
      retryable: false,
      actions: [
        { label: 'Copy Email', action: 'copy' },
        { label: 'Dismiss', action: 'dismiss' },
      ],
    };
  }

  // Check by status code
  if (statusCode) {
    switch (statusCode) {
      case 401:
        return {
          category: 'auth',
          title: 'Authentication Failed',
          message: 'Your session has expired. Please sign in again.',
          statusCode,
          retryable: false,
          actions: [{ label: 'Sign In', action: 'navigate', data: '/login' }],
        };

      case 403:
        return {
          category: 'auth',
          title: 'Permission Denied',
          message: "You don't have permission to perform this action.",
          statusCode,
          retryable: false,
        };

      case 429:
        const retryAfter = extractRetryAfter(errorMessage) || 30;
        return {
          category: 'rate_limit',
          title: 'Too Many Requests',
          message: `Please wait ${retryAfter} seconds before trying again.`,
          statusCode,
          retryable: true,
          retryAfter,
          actions: [{ label: 'Retry', action: 'retry' }],
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          category: 'server',
          title: 'Server Error',
          message: 'Something went wrong on our end. Please try again later.',
          technicalDetails: `HTTP ${statusCode}: ${errorMessage}`,
          statusCode,
          retryable: true,
          actions: [{ label: 'Retry', action: 'retry' }],
        };
    }
  }

  // Check for network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('offline') ||
    error instanceof TypeError
  ) {
    return {
      category: 'network',
      title: 'Connection Error',
      message: 'Unable to reach the server. Check your internet connection.',
      retryable: true,
      actions: [{ label: 'Retry', action: 'retry' }],
    };
  }

  // Check for Jira-specific errors
  if (
    lowerMessage.includes('jira') ||
    lowerMessage.includes('issue') ||
    lowerMessage.includes('atlassian')
  ) {
    return {
      category: 'jira',
      title: 'Jira Error',
      message: errorMessage,
      technicalDetails: errorMessage,
      retryable: true,
      actions: [{ label: 'Retry', action: 'retry' }],
    };
  }

  // Default to unknown
  return {
    category: 'unknown',
    title: 'Error',
    message: errorMessage || 'An unexpected error occurred.',
    retryable: false,
  };
}

/**
 * Get admin-friendly error details with technical information
 */
export function getAdminErrorDetails(
  error: CategorizedError,
  context?: {
    endpoint?: string;
    method?: string;
    timestamp?: Date;
  }
): string {
  const lines = [
    `Error: ${error.title}`,
    `Category: ${error.category}`,
    `Message: ${error.message}`,
  ];

  if (error.statusCode) {
    lines.push(`Status Code: ${error.statusCode}`);
  }

  if (error.technicalDetails) {
    lines.push(`Technical Details: ${error.technicalDetails}`);
  }

  if (context) {
    if (context.endpoint) {
      lines.push(`Endpoint: ${context.method || 'GET'} ${context.endpoint}`);
    }
    if (context.timestamp) {
      lines.push(`Time: ${context.timestamp.toISOString()}`);
    }
  }

  return lines.join('\n');
}

/**
 * Extract retry-after value from error message or headers
 */
function extractRetryAfter(message: string): number | null {
  const match = message.match(/(\d+)\s*second/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Form validation error helpers
 */
export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'minLength' | 'maxLength' | 'format' | 'custom';
}

export function createValidationError(
  field: string,
  type: ValidationError['type'],
  options?: { min?: number; max?: number; current?: number }
): ValidationError {
  let message: string;

  switch (type) {
    case 'required':
      message = `${capitalize(field)} is required`;
      break;
    case 'minLength':
      message = `${capitalize(field)} must be at least ${options?.min} characters (currently: ${options?.current})`;
      break;
    case 'maxLength':
      message = `${capitalize(field)} must be no more than ${options?.max} characters (currently: ${options?.current})`;
      break;
    case 'format':
      message = `${capitalize(field)} is not in a valid format`;
      break;
    default:
      message = `${capitalize(field)} is invalid`;
  }

  return { field, message, type };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * File validation helpers
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'application/zip',
  'application/x-zip-compressed',
];

export function validateFile(file: File): ValidationError | null {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      field: 'file',
      message: `File '${file.name}' exceeds 10MB limit (${sizeMB}MB)`,
      type: 'custom',
    };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    const extension = file.name.split('.').pop() || 'unknown';
    return {
      field: 'file',
      message: `File type '.${extension}' is not allowed. Allowed: images, PDFs, videos, zip`,
      type: 'format',
    };
  }

  return null;
}
