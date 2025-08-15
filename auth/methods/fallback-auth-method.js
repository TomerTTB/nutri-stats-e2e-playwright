/**
 * Fallback Authentication Method
 * Provides fallback capability from one authentication method to another
 * Primarily used for JWT -> Login fallback scenarios
 */

const { AuthMethod } = require('../interfaces/auth-method.interface');
const {
  AuthenticationError,
  JWTAuthenticationError,
  TokenValidationError,
  NetworkAuthenticationError,
  AuthErrorHandler
} = require('../errors/authentication-errors');

/**
 * Fallback Authentication Method Class
 * Attempts primary authentication method, falls back to secondary on failure
 */
class FallbackAuthMethod extends AuthMethod {
  /**
   * Constructor for fallback authentication method
   * @param {AuthMethod} primaryMethod - Primary authentication method to try first
   * @param {AuthMethod} fallbackMethod - Fallback authentication method to use on primary failure
   * @param {AuthConfig} config - Authentication configuration
   */
  constructor(primaryMethod, fallbackMethod, config) {
    super(config);
    
    if (!primaryMethod || !(primaryMethod instanceof AuthMethod)) {
      throw new AuthenticationError(
        'Primary method must be an instance of AuthMethod',
        'INVALID_PRIMARY_METHOD'
      );
    }
    
    if (!fallbackMethod || !(fallbackMethod instanceof AuthMethod)) {
      throw new AuthenticationError(
        'Fallback method must be an instance of AuthMethod',
        'INVALID_FALLBACK_METHOD'
      );
    }

    this.primaryMethod = primaryMethod;
    this.fallbackMethod = fallbackMethod;
    this.lastUsedMethod = null;
    this.fallbackReason = null;
  }

  /**
   * Get authentication method type
   * @returns {string} Authentication method type
   */
  getType() {
    return `fallback-${this.primaryMethod.getType()}-to-${this.fallbackMethod.getType()}`;
  }

  /**
   * Check if authentication method supports storage state
   * @returns {boolean} True if primary method supports storage state
   */
  supportsStorageState() {
    return this.primaryMethod.supportsStorageState && this.primaryMethod.supportsStorageState();
  }

  /**
   * Authenticate user with fallback capability
   * @param {Object} credentials - User credentials
   * @returns {Promise<AuthState>} Authentication state
   * @throws {AuthenticationError} When both methods fail
   */
  async authenticate(credentials) {
    let primaryError = null;

    try {
      if (process.env.DEBUG_AUTH === 'true') {
        console.log(`Attempting authentication with primary method: ${this.primaryMethod.getType()}`);
      }

      const authState = await this.primaryMethod.authenticate(credentials);
      this.lastUsedMethod = this.primaryMethod;
      this.fallbackReason = null;

      // Add fallback metadata to auth state
      authState.fallbackInfo = {
        usedFallback: false,
        primaryMethod: this.primaryMethod.getType(),
        fallbackMethod: this.fallbackMethod.getType()
      };

      return authState;

    } catch (error) {
      primaryError = error;
      
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn(`Primary authentication failed: ${error.message}`);
      }

      // Check if error is fallback-eligible
      if (!this._shouldFallback(error)) {
        throw error;
      }

      this.fallbackReason = error.code || error.name || 'UNKNOWN_ERROR';

      try {
        if (process.env.DEBUG_AUTH === 'true') {
          console.log(`Attempting fallback authentication with: ${this.fallbackMethod.getType()}`);
        }

        const authState = await this.fallbackMethod.authenticate(credentials);
        this.lastUsedMethod = this.fallbackMethod;

        // Add fallback metadata to auth state
        authState.fallbackInfo = {
          usedFallback: true,
          primaryMethod: this.primaryMethod.getType(),
          fallbackMethod: this.fallbackMethod.getType(),
          fallbackReason: this.fallbackReason,
          primaryError: {
            name: primaryError.name,
            message: primaryError.message,
            code: primaryError.code
          }
        };

        return authState;

      } catch (fallbackError) {
        // Both methods failed
        throw new AuthenticationError(
          `Authentication failed with both primary (${this.primaryMethod.getType()}) and fallback (${this.fallbackMethod.getType()}) methods`,
          'FALLBACK_EXHAUSTED',
          fallbackError,
          {
            primaryError: {
              name: primaryError.name,
              message: primaryError.message,
              code: primaryError.code
            },
            fallbackError: {
              name: fallbackError.name,
              message: fallbackError.message,
              code: fallbackError.code
            }
          }
        );
      }
    }
  }

  /**
   * Setup browser context using the last successful method
   * @param {import('@playwright/test').BrowserContext|import('@playwright/test').Page} context - Browser context or page
   * @param {AuthState} authState - Authentication state
   * @returns {Promise<void>}
   */
  async setupBrowserContext(context, authState) {
    const methodToUse = this._getMethodForAuthState(authState);
    
    try {
      await methodToUse.setupBrowserContext(context, authState);
    } catch (error) {
      // If setup fails and we used fallback for auth, don't try primary method setup
      if (authState.fallbackInfo?.usedFallback) {
        throw error;
      }

      // If primary method setup fails, try fallback method setup
      if (methodToUse === this.primaryMethod && this._shouldFallback(error)) {
        if (process.env.DEBUG_AUTH === 'true') {
          console.warn(`Primary method context setup failed, trying fallback: ${error.message}`);
        }

        try {
          await this.fallbackMethod.setupBrowserContext(context, authState);
        } catch (fallbackError) {
          throw new AuthenticationError(
            `Browser context setup failed with both methods`,
            'CONTEXT_SETUP_FALLBACK_EXHAUSTED',
            fallbackError,
            {
              primaryError: error.message,
              fallbackError: fallbackError.message
            }
          );
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate authentication state using appropriate method
   * @param {AuthState} authState - Authentication state to validate
   * @returns {Promise<boolean>} True if authentication is valid
   */
  async validateAuthentication(authState) {
    const methodToUse = this._getMethodForAuthState(authState);
    
    try {
      return await methodToUse.validateAuthentication(authState);
    } catch (error) {
      // If validation fails, try the other method as fallback
      const alternativeMethod = methodToUse === this.primaryMethod ? 
        this.fallbackMethod : this.primaryMethod;

      if (this._shouldFallback(error)) {
        try {
          return await alternativeMethod.validateAuthentication(authState);
        } catch (fallbackError) {
          // Both validations failed, return false rather than throwing
          if (process.env.DEBUG_AUTH === 'true') {
            console.warn(`Both validation methods failed: ${error.message}, ${fallbackError.message}`);
          }
          return false;
        }
      }

      // For non-fallback-eligible errors, return false
      return false;
    }
  }

  /**
   * Cleanup authentication resources using appropriate method
   * @param {AuthState} authState - Authentication state to cleanup
   * @returns {Promise<void>}
   */
  async cleanup(authState) {
    const methodToUse = this._getMethodForAuthState(authState);
    
    try {
      await methodToUse.cleanup(authState);
    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn(`Cleanup failed with ${methodToUse.getType()}: ${error.message}`);
      }
      // Don't throw cleanup errors as they shouldn't fail tests
    }

    // Also try cleanup with the other method if it's different
    const alternativeMethod = methodToUse === this.primaryMethod ? 
      this.fallbackMethod : this.primaryMethod;

    if (alternativeMethod !== methodToUse) {
      try {
        await alternativeMethod.cleanup(authState);
      } catch (error) {
        if (process.env.DEBUG_AUTH === 'true') {
          console.warn(`Alternative cleanup failed with ${alternativeMethod.getType()}: ${error.message}`);
        }
        // Don't throw cleanup errors
      }
    }
  }

  /**
   * Get the method that should be used for a given auth state
   * @private
   * @param {AuthState} authState - Authentication state
   * @returns {AuthMethod} Method to use
   */
  _getMethodForAuthState(authState) {
    // If auth state has fallback info, use the method that was actually used
    if (authState.fallbackInfo) {
      if (authState.fallbackInfo.usedFallback) {
        return this.fallbackMethod;
      } else {
        return this.primaryMethod;
      }
    }

    // If we have a record of last used method, use that
    if (this.lastUsedMethod) {
      return this.lastUsedMethod;
    }

    // Default to primary method
    return this.primaryMethod;
  }

  /**
   * Determine if an error should trigger fallback
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if should fallback
   */
  _shouldFallback(error) {
    // Always fallback for JWT-specific errors when primary is JWT
    if (this.primaryMethod.getType() === 'jwt') {
      if (error instanceof JWTAuthenticationError ||
          error instanceof TokenValidationError ||
          error.code === 'JWT_ERROR' ||
          error.code === 'TOKEN_VALIDATION_ERROR' ||
          error.code === 'TOKEN_EXPIRED' ||
          error.code === 'INVALID_TOKEN' ||
          error.code === 'TOKEN_ACQUISITION_FAILED') {
        return true;
      }
    }

    // Fallback for network errors if configured
    if (error instanceof NetworkAuthenticationError ||
        error.code === 'NETWORK_ERROR' ||
        error.code === 'AUTH_TIMEOUT') {
      return this.config.fallbackOnNetworkError !== false;
    }

    // Fallback for storage state errors
    if (error.code === 'STORAGE_STATE_ERROR' ||
        error.code === 'BROWSER_CONTEXT_ERROR') {
      return true;
    }

    // Don't fallback for credential errors (they would fail in fallback too)
    if (error.code === 'INVALID_CREDENTIALS' ||
        error.code === 'USER_REGISTRATION_ERROR' ||
        error.code === 'CONFIG_ERROR') {
      return false;
    }

    // Default fallback behavior based on configuration
    return this.config.fallbackToLogin !== false;
  }

  /**
   * Get information about the last fallback operation
   * @returns {Object|null} Fallback information or null if no fallback occurred
   */
  getFallbackInfo() {
    if (!this.lastUsedMethod || this.lastUsedMethod === this.primaryMethod) {
      return null;
    }

    return {
      usedFallback: true,
      primaryMethod: this.primaryMethod.getType(),
      fallbackMethod: this.fallbackMethod.getType(),
      fallbackReason: this.fallbackReason,
      lastUsedMethod: this.lastUsedMethod.getType()
    };
  }

  /**
   * Reset fallback state (mainly for testing)
   */
  resetFallbackState() {
    this.lastUsedMethod = null;
    this.fallbackReason = null;
  }

  /**
   * Get default configuration for fallback authentication method
   * @returns {Partial<AuthConfig>} Default configuration
   */
  static getDefaultConfig() {
    return {
      ...AuthMethod.getDefaultConfig(),
      fallbackToLogin: true,
      fallbackOnNetworkError: true
    };
  }
}

module.exports = {
  FallbackAuthMethod
};