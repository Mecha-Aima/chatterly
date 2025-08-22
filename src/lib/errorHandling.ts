import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ErrorResponse } from '@/types/session.types';

/**
 * Standard error codes for consistent API responses
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  
  // Resource Management
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // State Management
  INVALID_STATE = 'INVALID_STATE',
  TRANSITION_NOT_ALLOWED = 'TRANSITION_NOT_ALLOWED',
  
  // Database & External Services
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

/**
 * HTTP status codes mapping for different error types
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.INVALID_STATE]: 400,
  [ErrorCode.TRANSITION_NOT_ALLOWED]: 400,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.QUOTA_EXCEEDED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: 'Authentication required. Please log in to continue.',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to access this resource.',
  [ErrorCode.VALIDATION_ERROR]: 'The provided data is invalid. Please check your input.',
  [ErrorCode.INVALID_REQUEST]: 'The request is malformed or contains invalid parameters.',
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.ALREADY_EXISTS]: 'A resource with the same identifier already exists.',
  [ErrorCode.CONFLICT]: 'The request conflicts with the current state of the resource.',
  [ErrorCode.INVALID_STATE]: 'The resource is in an invalid state for this operation.',
  [ErrorCode.TRANSITION_NOT_ALLOWED]: 'The requested state transition is not allowed.',
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service is temporarily unavailable.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please slow down and try again later.',
  [ErrorCode.QUOTA_EXCEEDED]: 'You have exceeded your usage quota.',
  [ErrorCode.INTERNAL_ERROR]: 'An internal server error occurred. Please try again later.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.'
};

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  public code: ErrorCode;
  public statusCode: number;
  public details?: Record<string, any>;

  constructor(
    code: ErrorCode, 
    message?: string, 
    details?: Record<string, any>
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = ERROR_STATUS_MAP[code];
    this.details = details;
  }

  /**
   * Convert error to ErrorResponse format
   */
  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }

  /**
   * Convert error to NextResponse
   */
  toNextResponse(): NextResponse {
    return NextResponse.json(this.toResponse(), { status: this.statusCode });
  }
}

/**
 * Validation error handler for Zod validation results
 */
export class ValidationErrorHandler {
  /**
   * Create APIError from Zod validation result
   */
  static fromZodError(error: z.ZodError): APIError {
    const details = {
      validation_errors: error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    };

    return new APIError(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed for the provided data',
      details
    );
  }

  /**
   * Handle validation result and throw error if invalid
   */
  static handleValidation<T>(result: { success: boolean; data?: T; error?: z.ZodError }): T {
    if (!result.success || !result.data) {
      throw this.fromZodError(result.error!);
    }
    return result.data;
  }
}

/**
 * Database error handler for Supabase errors
 */
export class DatabaseErrorHandler {
  /**
   * Convert Supabase error to APIError
   */
  static fromSupabaseError(error: any): APIError {
    const details = {
      supabase_error: error.message,
      supabase_code: error.code,
      supabase_details: error.details
    };

    // Map specific Supabase error codes to appropriate API errors
    switch (error.code) {
      case 'PGRST116': // Not found
        return new APIError(ErrorCode.NOT_FOUND, 'Resource not found', details);
      
      case '23505': // Unique constraint violation
        return new APIError(ErrorCode.ALREADY_EXISTS, 'Resource already exists', details);
      
      case '23503': // Foreign key violation
        return new APIError(ErrorCode.INVALID_REQUEST, 'Invalid reference to related resource', details);
      
      case '42501': // Insufficient privilege
        return new APIError(ErrorCode.FORBIDDEN, 'Insufficient permissions', details);
      
      default:
        return new APIError(ErrorCode.DATABASE_ERROR, 'Database operation failed', details);
    }
  }
}

/**
 * Authentication error handler
 */
export class AuthErrorHandler {
  /**
   * Create authentication error
   */
  static createUnauthorizedError(message?: string): APIError {
    return new APIError(
      ErrorCode.UNAUTHORIZED,
      message || 'Authentication required'
    );
  }

  /**
   * Create forbidden error
   */
  static createForbiddenError(message?: string): APIError {
    return new APIError(
      ErrorCode.FORBIDDEN,
      message || 'Access denied'
    );
  }
}

/**
 * Session-specific error handler
 */
export class SessionErrorHandler {
  /**
   * Create session not found error
   */
  static createSessionNotFoundError(): APIError {
    return new APIError(
      ErrorCode.NOT_FOUND,
      'Session not found or you do not have access to it'
    );
  }

  /**
   * Create invalid session state error
   */
  static createInvalidStateError(currentState: string, attemptedAction: string): APIError {
    return new APIError(
      ErrorCode.INVALID_STATE,
      `Cannot ${attemptedAction} when session is in ${currentState} state`,
      { current_state: currentState, attempted_action: attemptedAction }
    );
  }

  /**
   * Create turn not found error
   */
  static createTurnNotFoundError(): APIError {
    return new APIError(
      ErrorCode.NOT_FOUND,
      'Turn not found or you do not have access to it'
    );
  }

  /**
   * Create session already completed error
   */
  static createSessionCompletedError(): APIError {
    return new APIError(
      ErrorCode.INVALID_STATE,
      'Session is already completed and cannot be modified'
    );
  }
}

/**
 * Global error handler for API routes
 */
export class GlobalErrorHandler {
  /**
   * Handle any error and convert to appropriate response
   */
  static handleError(error: unknown): NextResponse {
    console.error('API Error:', error);

    // If it's already an APIError, use it directly
    if (error instanceof APIError) {
      return error.toNextResponse();
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const apiError = ValidationErrorHandler.fromZodError(error);
      return apiError.toNextResponse();
    }

    // Handle Supabase errors
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const apiError = DatabaseErrorHandler.fromSupabaseError(error);
      return apiError.toNextResponse();
    }

    // Generic error handler
    const genericError = new APIError(ErrorCode.INTERNAL_ERROR);
    return genericError.toNextResponse();
  }

  /**
   * Async error handler wrapper for API routes
   */
  static withErrorHandling(handler: Function) {
    return async (...args: any[]) => {
      try {
        return await handler(...args);
      } catch (error) {
        return this.handleError(error);
      }
    };
  }
}

/**
 * Response utilities for consistent API responses
 */
export class ResponseUtils {
  /**
   * Create success response
   */
  static success<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
  }

  /**
   * Create created response
   */
  static created<T>(data: T): NextResponse {
    return NextResponse.json(data, { status: 201 });
  }

  /**
   * Create no content response
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  /**
   * Create error response
   */
  static error(
    code: ErrorCode, 
    message?: string, 
    details?: Record<string, any>
  ): NextResponse {
    const error = new APIError(code, message, details);
    return error.toNextResponse();
  }
}

/**
 * Security logging utilities
 */
export class SecurityLogger {
  /**
   * Log unauthorized access attempt
   */
  static logUnauthorizedAccess(
    endpoint: string, 
    ip?: string, 
    userAgent?: string
  ): void {
    console.warn('Unauthorized access attempt:', {
      endpoint,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log suspicious activity
   */
  static logSuspiciousActivity(
    activity: string, 
    userId?: string, 
    details?: Record<string, any>
  ): void {
    console.warn('Suspicious activity detected:', {
      activity,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log rate limit exceeded
   */
  static logRateLimitExceeded(
    endpoint: string, 
    identifier: string
  ): void {
    console.warn('Rate limit exceeded:', {
      endpoint,
      identifier,
      timestamp: new Date().toISOString()
    });
  }
}
