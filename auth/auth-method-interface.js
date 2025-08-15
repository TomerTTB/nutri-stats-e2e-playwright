/**
 * Base authentication method interface
 * Defines the contract that all authentication methods must implement
 */

/**
 * Authentication state object structure
 * @typedef {Object} AuthState
 * @property {string} token - JWT authentication token
 * @property {Object} user - User information object
 * @property {string} user.id - User ID
 * @property {string} user.username - Username
 * @property {string} user.email - User email
 * @property {string} method - Authentication method used ('login' or 'jwt')
 * @property {Date} [expiresAt] - Token expiration date (optional)
 * @property {Object} [storageState] - Playwright storage state (optional, for JWT method)
 */

/**
 * Authentication method configuration
 * @typedef {Object} AuthConfig
 * @property {string} baseURL - Application base URL
 * @property {string} [storageStatePath] - Path to storage state file (for JWT method)
 * @property {boolean} [fallbackToLogin] - Whether to fallback to login on JWT failure
 * @property {Object} [retryConfig] - Retry configuration
 * @property {number} [retryConfig.maxRetries] - Maximum number of retries
 * @property {number} [retryConfig.initialDelay] - Initial delay between retries in ms
 * @property {number} [retryConfig.backoffMultiplier] - Backoff multiplier for retries
 */

/**
 * Base authentication method interface
 * All authentication methods must implement this interface
 */
class AuthMethod {
  /**
   * Create authentication method instance
   * @param {AuthConfig} config - Authentication configuration
   */
  constructor(config) {
    if (this.constructor === AuthMethod) {
      throw new Error('AuthMethod is an abstract class and cannot be instantiated directly');
    }
    this.config = config;
  }

  /**
   * Authenticate user and return authentication state
   * @param {Object} credentials - User credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @param {string} [credentials.username] - Username (optional)
   * @returns {Promise<AuthState>} Authentication state
   * @throws {AuthenticationError} When authentication fails
   */
  async authenticate(credentials) {
    throw new Error('authenticate method must be implemented by subclass');
  }

  /**
   * Setup browser context with authentication state
   * @param {import('@playwright/test').Page|import('@playwright/test').BrowserContext} context - Browser page or context
   * @param {AuthState} authState - Authentication state
   * @returns {Promise<void>}
   * @throws {AuthenticationError} When context setup fails
   */
  async setupBrowserContext(context, authState) {
    throw new Error('setupBrowserContext method must be implemented by subclass');
  }

  /**
   * Validate authentication state
   * @param {AuthState} authState - Authentication state to validate
   * @returns {Promise<boolean>} Whether authentication state is valid
   */
  async validateAuthentication(authState) {
    throw new Error('validateAuthentication method must be implemented by subclass');
  }

  /**
   * Cleanup authentication resources
   * @param {AuthState} authState - Authentication state to cleanup
   * @returns {Promise<void>}
   */
  async cleanup(authState) {
    throw new Error('cleanup method must be implemented by subclass');
  }

  /**
   * Get authentication method name
   * @returns {string} Method name
   */
  getMethodName() {
    return this.constructor.name.replace('AuthMethod', '').toLowerCase();
  }
}

/**
 * Authentication error class
 */
class AuthenticationError extends Error {
  /**
   * Create authentication error
   * @param {string} message - Error message
   * @param {string} [code] - Error code
   * @param {Error} [cause] - Original error cause
   */
  constructor(message, code = 'AUTH_ERROR', cause = null) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Authentication retry error class
 */
class AuthenticationRetryError extends AuthenticationError {
  /**
   * Create authentication retry error
   * @param {string} message - Error message
   * @param {number} attempts - Number of attempts made
   * @param {Error} lastError - Last error encountered
   */
  constructor(message, attempts, lastError) {
    super(message, 'AUTH_RETRY_EXHAUSTED', lastError);
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

module.exports = {
  AuthMethod,
  AuthenticationError,
  AuthenticationRetryError
};