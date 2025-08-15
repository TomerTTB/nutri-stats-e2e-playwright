/**
 * Base authentication method interface
 * Defines the contract that all authentication strategies must implement
 */

/**
 * Authentication state object structure
 * @typedef {Object} AuthState
 * @property {string} token - JWT authentication token
 * @property {Object} user - User information object
 * @property {string} user.id - User ID
 * @property {string} user.username - Username
 * @property {string} user.email - User email
 * @property {string} strategy - Authentication strategy used ('login' | 'jwt')
 * @property {Object} [storageState] - Playwright storage state (JWT only)
 * @property {Date} [expiresAt] - Token expiration date (JWT only)
 * @property {string} [refreshToken] - Refresh token for future enhancement
 */

/**
 * Authentication configuration object structure
 * @typedef {Object} AuthConfig
 * @property {string} strategy - Authentication strategy ('login' | 'jwt')
 * @property {string} baseURL - Application base URL
 * @property {boolean} [persistStorageState] - Whether to persist storage state
 * @property {string} [storageStatePath] - Path to storage state file
 * @property {boolean} [fallbackToLogin] - Fallback to login on JWT failure
 * @property {string} [tokenEndpoint] - Custom token endpoint
 * @property {number} [tokenExpiration] - Token expiration time in seconds
 * @property {Object} [retryConfig] - Retry configuration
 * @property {number} [retryConfig.maxRetries] - Maximum number of retries
 * @property {number} [retryConfig.backoffMultiplier] - Backoff multiplier
 * @property {number} [retryConfig.initialDelay] - Initial delay in ms
 */

/**
 * Base authentication method interface
 * All authentication strategies must implement this interface
 */
class AuthMethod {
  /**
   * Constructor for authentication method
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
   * @param {string} [credentials.username] - Username (for registration)
   * @param {string} [credentials.name] - Display name (for registration)
   * @returns {Promise<AuthState>} Authentication state
   * @throws {AuthenticationError} When authentication fails
   */
  async authenticate(credentials) {
    throw new Error('authenticate method must be implemented by subclass');
  }

  /**
   * Setup browser context with authentication state
   * @param {import('@playwright/test').BrowserContext|import('@playwright/test').Page} context - Browser context or page
   * @param {AuthState} authState - Authentication state from authenticate method
   * @returns {Promise<void>}
   * @throws {AuthenticationError} When context setup fails
   */
  async setupBrowserContext(context, authState) {
    throw new Error('setupBrowserContext method must be implemented by subclass');
  }

  /**
   * Validate authentication state
   * @param {AuthState} authState - Authentication state to validate
   * @returns {Promise<boolean>} True if authentication is valid
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
   * Get authentication method type
   * @returns {string} Authentication method type
   */
  getType() {
    throw new Error('getType method must be implemented by subclass');
  }

  /**
   * Check if authentication method supports storage state
   * @returns {boolean} True if supports storage state
   */
  supportsStorageState() {
    return false;
  }

  /**
   * Get default configuration for this authentication method
   * @returns {Partial<AuthConfig>} Default configuration
   */
  static getDefaultConfig() {
    return {
      baseURL: process.env.BASE_URL || 'http://localhost:8080',
      persistStorageState: false,
      fallbackToLogin: false,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    };
  }

  /**
   * Validate configuration for this authentication method
   * @param {AuthConfig} config - Configuration to validate
   * @throws {ConfigurationError} When configuration is invalid
   */
  static validateConfig(config) {
    if (!config) {
      throw new Error('Configuration is required');
    }

    if (!config.baseURL) {
      throw new Error('baseURL is required in configuration');
    }

    if (config.retryConfig) {
      const { maxRetries, backoffMultiplier, initialDelay } = config.retryConfig;
      
      if (maxRetries !== undefined && (typeof maxRetries !== 'number' || maxRetries < 0)) {
        throw new Error('retryConfig.maxRetries must be a non-negative number');
      }
      
      if (backoffMultiplier !== undefined && (typeof backoffMultiplier !== 'number' || backoffMultiplier < 1)) {
        throw new Error('retryConfig.backoffMultiplier must be a number >= 1');
      }
      
      if (initialDelay !== undefined && (typeof initialDelay !== 'number' || initialDelay < 0)) {
        throw new Error('retryConfig.initialDelay must be a non-negative number');
      }
    }
  }
}

module.exports = {
  AuthMethod
};