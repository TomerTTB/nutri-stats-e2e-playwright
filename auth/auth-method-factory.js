/**
 * Authentication method factory
 * Creates authentication method instances based on configuration
 */

const { AuthenticationError } = require('./auth-method-interface');

/**
 * Authentication method factory class
 */
class AuthMethodFactory {
  /**
   * Create authentication method instance
   * @param {string} methodType - Authentication method type ('login' or 'jwt')
   * @param {Object} config - Authentication configuration
   * @returns {AuthMethod} Authentication method instance
   * @throws {AuthenticationError} When method type is unknown
   */
  static create(methodType, config = {}) {
    // Normalize method type
    const normalizedType = methodType?.toLowerCase();

    switch (normalizedType) {
      case 'login':
        const LoginAuthMethod = require('./login-auth-method');
        return new LoginAuthMethod(config);
      
      case 'jwt':
        const JWTAuthMethod = require('./jwt-auth-method');
        return new JWTAuthMethod(config);
      
      default:
        throw new AuthenticationError(
          `Unknown authentication method: ${methodType}. Supported methods: 'login', 'jwt'`,
          'UNKNOWN_AUTH_METHOD'
        );
    }
  }

  /**
   * Get available authentication methods
   * @returns {string[]} Array of available method names
   */
  static getAvailableMethods() {
    return ['login', 'jwt'];
  }

  /**
   * Validate method type
   * @param {string} methodType - Method type to validate
   * @returns {boolean} Whether method type is valid
   */
  static isValidMethodType(methodType) {
    return this.getAvailableMethods().includes(methodType?.toLowerCase());
  }

  /**
   * Create method with fallback
   * Creates primary method, with fallback to secondary method if primary fails
   * @param {string} primaryMethod - Primary authentication method
   * @param {string} fallbackMethod - Fallback authentication method
   * @param {Object} config - Authentication configuration
   * @returns {AuthMethod} Authentication method with fallback capability
   */
  static createWithFallback(primaryMethod, fallbackMethod, config = {}) {
    const FallbackAuthMethod = require('./fallback-auth-method');
    
    const primaryInstance = this.create(primaryMethod, config);
    const fallbackInstance = this.create(fallbackMethod, config);
    
    return new FallbackAuthMethod(primaryInstance, fallbackInstance, config);
  }

  /**
   * Create method from environment configuration
   * @param {Object} [envOverrides] - Environment variable overrides
   * @returns {AuthMethod} Authentication method instance
   */
  static createFromEnvironment(envOverrides = {}) {
    const env = { ...process.env, ...envOverrides };
    
    const methodType = env.AUTH_STRATEGY || env.AUTH_METHOD || 'login';
    
    const config = {
      baseURL: env.BASE_URL || env.API_BASE_URL || 'http://localhost:8080',
      storageStatePath: env.AUTH_STORAGE_PATH || '.auth/user.json',
      fallbackToLogin: env.JWT_FALLBACK_LOGIN === 'true',
      retryConfig: {
        maxRetries: parseInt(env.AUTH_MAX_RETRIES || '3', 10),
        initialDelay: parseInt(env.AUTH_RETRY_DELAY || '1000', 10),
        backoffMultiplier: parseFloat(env.AUTH_BACKOFF_MULTIPLIER || '2')
      }
    };

    // If JWT method with fallback enabled, create with fallback
    if (methodType === 'jwt' && config.fallbackToLogin) {
      return this.createWithFallback('jwt', 'login', config);
    }

    return this.create(methodType, config);
  }
}

module.exports = AuthMethodFactory;