/**
 * Authentication error classes for handling various authentication failures
 */

/**
 * Base authentication error class
 */
class AuthenticationError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} [code] - Error code
   * @param {Error} [cause] - Original error that caused this error
   * @param {Object} [context] - Additional context information
   */
  constructor(message, code = 'AUTH_ERROR', cause = null, context = {}) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.cause = cause;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }

  /**
   * Convert error to JSON for logging
   * @returns {Object} JSON representation of error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : null
    };
  }
}

/**
 * JWT-specific authentication errors
 */
class JWTAuthenticationError extends AuthenticationError {
  constructor(message, code = 'JWT_ERROR', cause = null, context = {}) {
    super(message, code, cause, context);
    this.name = 'JWTAuthenticationError';
  }
}

/**
 * Token validation errors
 */
class TokenValidationError extends JWTAuthenticationError {
  constructor(message, cause = null, context = {}) {
    super(message, 'TOKEN_VALIDATION_ERROR', cause, context);
    this.name = 'TokenValidationError';
  }
}

/**
 * Token expiration errors
 */
class TokenExpiredError extends JWTAuthenticationError {
  constructor(message = 'Authentication token has expired', cause = null, context = {}) {
    super(message, 'TOKEN_EXPIRED', cause, context);
    this.name = 'TokenExpiredError';
  }
}

/**
 * Invalid token format errors
 */
class InvalidTokenError extends JWTAuthenticationError {
  constructor(message = 'Invalid token format', cause = null, context = {}) {
    super(message, 'INVALID_TOKEN', cause, context);
    this.name = 'InvalidTokenError';
  }
}

/**
 * Login-specific authentication errors
 */
class LoginAuthenticationError extends AuthenticationError {
  constructor(message, code = 'LOGIN_ERROR', cause = null, context = {}) {
    super(message, code, cause, context);
    this.name = 'LoginAuthenticationError';
  }
}

/**
 * Invalid credentials errors
 */
class InvalidCredentialsError extends LoginAuthenticationError {
  constructor(message = 'Invalid username or password', cause = null, context = {}) {
    super(message, 'INVALID_CREDENTIALS', cause, context);
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * User registration errors
 */
class UserRegistrationError extends LoginAuthenticationError {
  constructor(message, cause = null, context = {}) {
    super(message, 'USER_REGISTRATION_ERROR', cause, context);
    this.name = 'UserRegistrationError';
  }
}

/**
 * Network-related authentication errors
 */
class NetworkAuthenticationError extends AuthenticationError {
  constructor(message, cause = null, context = {}) {
    super(message, 'NETWORK_ERROR', cause, context);
    this.name = 'NetworkAuthenticationError';
  }
}

/**
 * Timeout errors during authentication
 */
class AuthenticationTimeoutError extends AuthenticationError {
  constructor(message = 'Authentication operation timed out', cause = null, context = {}) {
    super(message, 'AUTH_TIMEOUT', cause, context);
    this.name = 'AuthenticationTimeoutError';
  }
}

/**
 * Configuration errors
 */
class ConfigurationError extends AuthenticationError {
  constructor(message, cause = null, context = {}) {
    super(message, 'CONFIG_ERROR', cause, context);
    this.name = 'ConfigurationError';
  }
}

/**
 * Storage state errors
 */
class StorageStateError extends AuthenticationError {
  constructor(message, cause = null, context = {}) {
    super(message, 'STORAGE_STATE_ERROR', cause, context);
    this.name = 'StorageStateError';
  }
}

/**
 * Browser context setup errors
 */
class BrowserContextError extends AuthenticationError {
  constructor(message, cause = null, context = {}) {
    super(message, 'BROWSER_CONTEXT_ERROR', cause, context);
    this.name = 'BrowserContextError';
  }
}

/**
 * Retry exhausted error
 */
class RetryExhaustedError extends AuthenticationError {
  constructor(message, attempts, cause = null, context = {}) {
    super(message, 'RETRY_EXHAUSTED', cause, { ...context, attempts });
    this.name = 'RetryExhaustedError';
    this.attempts = attempts;
  }
}

/**
 * Error handler utility class for authentication operations
 */
class AuthErrorHandler {
  /**
   * Handle JWT authentication errors with fallback logic
   * @param {Error} error - Original error
   * @param {Object} config - Authentication configuration
   * @returns {Promise<AuthMethod>} Fallback authentication method or rethrows error
   */
  static async handleJWTError(error, config) {
    // Import here to avoid circular dependency
    const { AuthMethodFactory } = require('../factory/auth-method-factory');

    if (config.fallbackToLogin && (
      error instanceof JWTAuthenticationError ||
      error.code === 'JWT_INVALID' ||
      error.code === 'TOKEN_VALIDATION_ERROR'
    )) {
      console.warn('JWT authentication failed, falling back to login method');
      return AuthMethodFactory.create('login', config);
    }

    if (error instanceof NetworkAuthenticationError && config.retryConfig) {
      throw new RetryExhaustedError(
        `Network error during authentication: ${error.message}`,
        0,
        error,
        { originalError: error.code }
      );
    }

    // Re-throw as authentication error if not already
    if (!(error instanceof AuthenticationError)) {
      throw new AuthenticationError(
        `Authentication failed: ${error.message}`,
        'UNKNOWN_AUTH_ERROR',
        error
      );
    }

    throw error;
  }

  /**
   * Retry authentication operation with exponential backoff
   * @param {Function} operation - Authentication operation to retry
   * @param {Object} retryConfig - Retry configuration
   * @param {string} operationName - Name of operation for error messages
   * @returns {Promise<any>} Result of successful operation
   * @throws {RetryExhaustedError} When all retries are exhausted
   */
  static async retryWithBackoff(operation, retryConfig, operationName = 'authentication') {
    const { maxRetries = 3, backoffMultiplier = 2, initialDelay = 1000 } = retryConfig;
    let lastError = null;
    const startTime = Date.now();
    const retryAttempts = [];

    if (process.env.DEBUG_AUTH === 'true') {
      console.log(`Starting ${operationName} with retry config:`, {
        maxRetries,
        backoffMultiplier,
        initialDelay
      });
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        const result = await operation();
        
        const totalTime = Date.now() - startTime;
        const attemptTime = Date.now() - attemptStartTime;
        
        if (process.env.DEBUG_AUTH === 'true' && attempt > 1) {
          console.log(`${operationName} succeeded on attempt ${attempt} after ${totalTime}ms total (attempt took ${attemptTime}ms)`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        const attemptTime = Date.now() - attemptStartTime;
        
        retryAttempts.push({
          attempt,
          error: {
            name: error.name,
            message: error.message,
            code: error.code
          },
          duration: attemptTime,
          timestamp: new Date().toISOString()
        });

        // Don't retry certain types of errors
        if (!this.isRetryableError(error)) {
          if (process.env.DEBUG_AUTH === 'true') {
            console.warn(`${operationName} failed with non-retryable error on attempt ${attempt}:`, {
              error: error.message,
              code: error.code,
              type: error.name
            });
          }
          throw error;
        }

        if (attempt === maxRetries) {
          const totalTime = Date.now() - startTime;
          
          if (process.env.DEBUG_AUTH === 'true') {
            console.error(`${operationName} exhausted all ${maxRetries} attempts after ${totalTime}ms:`, {
              attempts: retryAttempts,
              finalError: error.message
            });
          }
          
          throw new RetryExhaustedError(
            `${operationName} failed after ${maxRetries} attempts: ${error.message}`,
            attempt,
            error,
            { 
              operationName,
              totalTime,
              attempts: retryAttempts
            }
          );
        }

        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
        
        if (process.env.DEBUG_AUTH === 'true') {
          console.warn(`${operationName} attempt ${attempt}/${maxRetries} failed (took ${attemptTime}ms), retrying in ${delay}ms:`, {
            error: error.message,
            code: error.code,
            type: error.name,
            isRetryable: this.isRetryableError(error)
          });
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but just in case
    const totalTime = Date.now() - startTime;
    throw new RetryExhaustedError(
      `${operationName} failed after ${maxRetries} attempts`,
      maxRetries,
      lastError,
      { 
        operationName,
        totalTime,
        attempts: retryAttempts
      }
    );
  }

  /**
   * Wrap an async operation with timeout
   * @param {Function} operation - Async operation to wrap
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} operationName - Name of operation for error messages
   * @returns {Promise<any>} Result of operation
   * @throws {AuthenticationTimeoutError} When operation times out
   */
  static async withTimeout(operation, timeoutMs, operationName = 'authentication') {
    const startTime = Date.now();
    
    if (process.env.DEBUG_AUTH === 'true') {
      console.log(`Starting ${operationName} with ${timeoutMs}ms timeout`);
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        const elapsedTime = Date.now() - startTime;
        
        if (process.env.DEBUG_AUTH === 'true') {
          console.error(`${operationName} timed out after ${elapsedTime}ms (limit: ${timeoutMs}ms)`);
        }
        
        reject(new AuthenticationTimeoutError(
          `${operationName} operation timed out after ${timeoutMs}ms`,
          null,
          { 
            timeoutMs,
            elapsedTime,
            operationName
          }
        ));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      const elapsedTime = Date.now() - startTime;
      
      if (process.env.DEBUG_AUTH === 'true') {
        console.log(`${operationName} completed successfully in ${elapsedTime}ms`);
      }
      
      return result;
      
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      
      if (error instanceof AuthenticationTimeoutError) {
        if (process.env.DEBUG_AUTH === 'true') {
          console.error(`${operationName} timed out:`, {
            timeoutMs,
            elapsedTime,
            operationName
          });
        }
        throw error;
      }
      
      if (process.env.DEBUG_AUTH === 'true') {
        console.error(`${operationName} failed after ${elapsedTime}ms:`, {
          error: error.message,
          code: error.code,
          type: error.name
        });
      }
      
      throw new AuthenticationError(
        `${operationName} failed: ${error.message}`,
        'OPERATION_FAILED',
        error,
        {
          elapsedTime,
          operationName
        }
      );
    }
  }

  /**
   * Create appropriate error from API response
   * @param {Object} response - API response object
   * @param {string} operation - Operation that failed
   * @returns {AuthenticationError} Appropriate error instance
   */
  static createErrorFromResponse(response, operation = 'authentication') {
    const { status, data } = response;
    const message = data?.message || data?.error || `${operation} failed`;

    switch (status) {
      case 401:
        return new InvalidCredentialsError(message, null, { status, data });
      case 403:
        return new AuthenticationError(message, 'FORBIDDEN', null, { status, data });
      case 404:
        return new AuthenticationError(message, 'NOT_FOUND', null, { status, data });
      case 422:
        return new UserRegistrationError(message, null, { status, data });
      case 429:
        return new AuthenticationError(message, 'RATE_LIMITED', null, { status, data });
      case 500:
      case 502:
      case 503:
      case 504:
        return new NetworkAuthenticationError(message, null, { status, data });
      default:
        return new AuthenticationError(message, 'HTTP_ERROR', null, { status, data });
    }
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if error should be retried
   */
  static isRetryableError(error) {
    // Don't retry authentication/validation errors
    if (error instanceof InvalidCredentialsError ||
        error instanceof ConfigurationError ||
        error instanceof InvalidTokenError ||
        error instanceof UserRegistrationError) {
      return false;
    }

    // Retry network errors and timeouts
    if (error instanceof NetworkAuthenticationError ||
        error instanceof AuthenticationTimeoutError) {
      return true;
    }

    // Retry certain HTTP status codes
    if (error.context?.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.context.status);
    }

    // Retry certain error codes
    if (error.code) {
      const retryableCodes = [
        'ECONNREFUSED',
        'ENOTFOUND', 
        'ETIMEDOUT',
        'ECONNRESET',
        'EHOSTUNREACH',
        'NETWORK_ERROR',
        'AUTH_TIMEOUT',
        'STORAGE_STATE_ERROR',
        'BROWSER_CONTEXT_ERROR'
      ];
      return retryableCodes.includes(error.code);
    }

    return false;
  }

  /**
   * Comprehensive retry wrapper with timeout and logging
   * @param {Function} operation - Operation to retry
   * @param {Object} config - Configuration object
   * @param {Object} config.retryConfig - Retry configuration
   * @param {number} [config.timeoutMs] - Timeout in milliseconds
   * @param {string} [operationName] - Name for logging
   * @returns {Promise<any>} Result of successful operation
   */
  static async retryWithTimeoutAndLogging(operation, config, operationName = 'operation') {
    const { retryConfig, timeoutMs } = config;
    
    // If no retry config, just apply timeout if specified
    if (!retryConfig || retryConfig.maxRetries <= 0) {
      if (timeoutMs) {
        return this.withTimeout(operation, timeoutMs, operationName);
      }
      return operation();
    }

    // Create retry operation
    const retryOperation = () => this.retryWithBackoff(operation, retryConfig, operationName);
    
    // Apply timeout if specified
    if (timeoutMs) {
      return this.withTimeout(retryOperation, timeoutMs, operationName);
    }
    
    return retryOperation();
  }

  /**
   * Create a retry-enabled version of an authentication method
   * @param {AuthMethod} authMethod - Authentication method to wrap
   * @param {Object} retryConfig - Retry configuration
   * @returns {AuthMethod} Wrapped authentication method
   */
  static wrapWithRetry(authMethod, retryConfig) {
    const originalAuthenticate = authMethod.authenticate.bind(authMethod);
    const originalSetupBrowserContext = authMethod.setupBrowserContext.bind(authMethod);
    const originalValidateAuthentication = authMethod.validateAuthentication.bind(authMethod);

    // Wrap authenticate method
    authMethod.authenticate = async function(credentials) {
      return AuthErrorHandler.retryWithTimeoutAndLogging(
        () => originalAuthenticate(credentials),
        { 
          retryConfig,
          timeoutMs: authMethod.config.authTimeout || 60000 // 60 second default
        },
        `${authMethod.getType()} authenticate`
      );
    };

    // Wrap setupBrowserContext method
    authMethod.setupBrowserContext = async function(context, authState) {
      return AuthErrorHandler.retryWithTimeoutAndLogging(
        () => originalSetupBrowserContext(context, authState),
        { 
          retryConfig,
          timeoutMs: authMethod.config.setupTimeout || 30000 // 30 second default
        },
        `${authMethod.getType()} setupBrowserContext`
      );
    };

    // Wrap validateAuthentication method (with lighter retry config)
    authMethod.validateAuthentication = async function(authState) {
      const lightRetryConfig = {
        ...retryConfig,
        maxRetries: Math.min(retryConfig.maxRetries || 3, 2) // Max 2 retries for validation
      };
      
      return AuthErrorHandler.retryWithTimeoutAndLogging(
        () => originalValidateAuthentication(authState),
        { 
          retryConfig: lightRetryConfig,
          timeoutMs: authMethod.config.validateTimeout || 15000 // 15 second default
        },
        `${authMethod.getType()} validateAuthentication`
      );
    };

    return authMethod;
  }
}

module.exports = {
  AuthenticationError,
  JWTAuthenticationError,
  TokenValidationError,
  TokenExpiredError,
  InvalidTokenError,
  LoginAuthenticationError,
  InvalidCredentialsError,
  UserRegistrationError,
  NetworkAuthenticationError,
  AuthenticationTimeoutError,
  ConfigurationError,
  StorageStateError,
  BrowserContextError,
  RetryExhaustedError,
  AuthErrorHandler
};