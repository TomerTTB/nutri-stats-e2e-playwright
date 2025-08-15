/**
 * Factory class for creating authentication method instances
 * Provides centralized creation and configuration of authentication strategies
 */

const { AuthMethod } = require('../interfaces/auth-method.interface');
const {
  AuthenticationError,
  ConfigurationError,
  AuthErrorHandler
} = require('../errors/authentication-errors');

/**
 * Factory class for creating authentication method instances
 */
class AuthMethodFactory {
  /**
   * Registry of available authentication methods
   * @private
   */
  static _methodRegistry = new Map();

  /**
   * Default configuration for authentication methods
   * @private
   */
  static _defaultConfig = {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    strategy: process.env.AUTH_STRATEGY || 'login',
    persistStorageState: process.env.PERSIST_AUTH_STATE === 'true',
    storageStatePath: process.env.AUTH_STORAGE_PATH || '.auth/user.json',
    fallbackToLogin: process.env.JWT_FALLBACK_LOGIN === 'true',
    tokenEndpoint: process.env.TOKEN_ENDPOINT || '/api/auth/token',
    tokenExpiration: parseInt(process.env.TOKEN_EXPIRATION || '3600', 10),
    retryConfig: {
      maxRetries: parseInt(process.env.AUTH_MAX_RETRIES || '3', 10),
      backoffMultiplier: parseFloat(process.env.AUTH_BACKOFF_MULTIPLIER || '2'),
      initialDelay: parseInt(process.env.AUTH_RETRY_DELAY || '1000', 10)
    }
  };

  /**
   * Register an authentication method class
   * @param {string} methodType - Type identifier for the method
   * @param {typeof AuthMethod} methodClass - Authentication method class
   * @throws {ConfigurationError} When method type or class is invalid
   */
  static registerMethod(methodType, methodClass) {
    if (!methodType || typeof methodType !== 'string') {
      throw new ConfigurationError('Method type must be a non-empty string');
    }

    if (!methodClass || typeof methodClass !== 'function') {
      throw new ConfigurationError('Method class must be a constructor function');
    }

    // Verify the class extends AuthMethod (basic duck typing check)
    if (!methodClass.prototype || 
        typeof methodClass.prototype.authenticate !== 'function' ||
        typeof methodClass.prototype.setupBrowserContext !== 'function' ||
        typeof methodClass.prototype.validateAuthentication !== 'function' ||
        typeof methodClass.prototype.cleanup !== 'function') {
      throw new ConfigurationError(
        'Method class must implement AuthMethod interface (authenticate, setupBrowserContext, validateAuthentication, cleanup)'
      );
    }

    this._methodRegistry.set(methodType.toLowerCase(), methodClass);
  }

  /**
   * Unregister an authentication method
   * @param {string} methodType - Type identifier for the method
   */
  static unregisterMethod(methodType) {
    if (methodType && typeof methodType === 'string') {
      this._methodRegistry.delete(methodType.toLowerCase());
    }
  }

  /**
   * Get list of registered authentication method types
   * @returns {string[]} Array of registered method types
   */
  static getRegisteredMethods() {
    return Array.from(this._methodRegistry.keys());
  }

  /**
   * Check if an authentication method is registered
   * @param {string} methodType - Type identifier to check
   * @returns {boolean} True if method is registered
   */
  static isMethodRegistered(methodType) {
    return this._methodRegistry.has(methodType?.toLowerCase());
  }

  /**
   * Create an authentication method instance
   * @param {string} methodType - Type of authentication method ('login' | 'jwt')
   * @param {Object} [config] - Configuration object (merged with defaults)
   * @returns {AuthMethod} Authentication method instance
   * @throws {ConfigurationError} When method type is unknown or configuration is invalid
   * @throws {AuthenticationError} When method creation fails
   */
  static create(methodType, config = {}) {
    if (!methodType || typeof methodType !== 'string') {
      throw new ConfigurationError('Method type is required and must be a string');
    }

    const normalizedType = methodType.toLowerCase();

    if (!this._methodRegistry.has(normalizedType)) {
      const availableMethods = this.getRegisteredMethods();
      throw new ConfigurationError(
        `Unknown authentication method: ${methodType}. Available methods: ${availableMethods.join(', ')}`
      );
    }

    try {
      // Merge configuration with defaults
      const mergedConfig = this._mergeConfig(config);

      // Validate merged configuration
      this._validateConfig(mergedConfig, normalizedType);

      // Get method class and create instance
      const MethodClass = this._methodRegistry.get(normalizedType);
      const methodInstance = new MethodClass(mergedConfig);

      // Verify instance implements the interface correctly
      this._validateMethodInstance(methodInstance, normalizedType);

      return methodInstance;

    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }

      throw new AuthenticationError(
        `Failed to create authentication method '${methodType}': ${error.message}`,
        'METHOD_CREATION_ERROR',
        error,
        { methodType, config }
      );
    }
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
    const { FallbackAuthMethod } = require('../methods/fallback-auth-method');
    
    const primaryInstance = this.create(primaryMethod, config);
    const fallbackInstance = this.create(fallbackMethod, config);
    
    return new FallbackAuthMethod(primaryInstance, fallbackInstance, config);
  }

  /**
   * Create authentication method from environment configuration
   * @param {Object} [configOverrides] - Configuration overrides
   * @returns {AuthMethod} Authentication method instance
   */
  static createFromEnvironment(configOverrides = {}) {
    const envStrategy = process.env.AUTH_STRATEGY || 'login';
    const envConfig = this._loadEnvironmentConfig();
    const finalConfig = { ...envConfig, ...configOverrides };

    // If JWT method with fallback enabled, create with fallback
    if (envStrategy === 'jwt' && finalConfig.fallbackToLogin) {
      return this.createWithFallback('jwt', 'login', finalConfig);
    }

    return this.create(envStrategy, finalConfig);
  }

  /**
   * Create authentication method with retry wrapper
   * @param {string} methodType - Type of authentication method
   * @param {Object} [config] - Configuration object
   * @returns {AuthMethod} Authentication method instance with retry capabilities
   */
  static createWithRetry(methodType, config = {}) {
    const method = this.create(methodType, config);
    return this._wrapWithRetry(method);
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration object
   */
  static getDefaultConfig() {
    return { ...this._defaultConfig };
  }

  /**
   * Update default configuration
   * @param {Object} configUpdates - Configuration updates to merge
   */
  static updateDefaultConfig(configUpdates) {
    if (configUpdates && typeof configUpdates === 'object') {
      this._defaultConfig = { ...this._defaultConfig, ...configUpdates };
    }
  }

  /**
   * Reset factory to initial state (mainly for testing)
   */
  static reset() {
    this._methodRegistry.clear();
    this._defaultConfig = {
      baseURL: process.env.BASE_URL || 'http://localhost:8080',
      strategy: process.env.AUTH_STRATEGY || 'login',
      persistStorageState: process.env.PERSIST_AUTH_STATE === 'true',
      storageStatePath: process.env.AUTH_STORAGE_PATH || '.auth/user.json',
      fallbackToLogin: process.env.JWT_FALLBACK_LOGIN === 'true',
      tokenEndpoint: process.env.TOKEN_ENDPOINT || '/api/auth/token',
      tokenExpiration: parseInt(process.env.TOKEN_EXPIRATION || '3600', 10),
      retryConfig: {
        maxRetries: parseInt(process.env.AUTH_MAX_RETRIES || '3', 10),
        backoffMultiplier: parseFloat(process.env.AUTH_BACKOFF_MULTIPLIER || '2'),
        initialDelay: parseInt(process.env.AUTH_RETRY_DELAY || '1000', 10)
      }
    };
  }

  /**
   * Merge configuration with defaults
   * @private
   * @param {Object} config - User configuration
   * @returns {Object} Merged configuration
   */
  static _mergeConfig(config) {
    const merged = { ...this._defaultConfig };

    // Deep merge retry config
    if (config.retryConfig) {
      merged.retryConfig = { ...merged.retryConfig, ...config.retryConfig };
    }

    // Merge other properties
    Object.keys(config).forEach(key => {
      if (key !== 'retryConfig') {
        merged[key] = config[key];
      }
    });

    return merged;
  }

  /**
   * Validate configuration for specific method type
   * @private
   * @param {Object} config - Configuration to validate
   * @param {string} methodType - Method type being created
   * @throws {ConfigurationError} When configuration is invalid
   */
  static _validateConfig(config, methodType) {
    // Basic validation
    if (!config.baseURL) {
      throw new ConfigurationError('baseURL is required in configuration');
    }

    try {
      new URL(config.baseURL);
    } catch (error) {
      throw new ConfigurationError(`Invalid baseURL: ${config.baseURL}`);
    }

    // Validate retry configuration
    if (config.retryConfig) {
      const { maxRetries, backoffMultiplier, initialDelay } = config.retryConfig;

      if (maxRetries !== undefined && (typeof maxRetries !== 'number' || maxRetries < 0)) {
        throw new ConfigurationError('retryConfig.maxRetries must be a non-negative number');
      }

      if (backoffMultiplier !== undefined && (typeof backoffMultiplier !== 'number' || backoffMultiplier < 1)) {
        throw new ConfigurationError('retryConfig.backoffMultiplier must be a number >= 1');
      }

      if (initialDelay !== undefined && (typeof initialDelay !== 'number' || initialDelay < 0)) {
        throw new ConfigurationError('retryConfig.initialDelay must be a non-negative number');
      }
    }

    // Method-specific validation
    if (methodType === 'jwt') {
      if (config.persistStorageState && !config.storageStatePath) {
        throw new ConfigurationError('storageStatePath is required when persistStorageState is true');
      }

      if (config.tokenExpiration !== undefined && 
          (typeof config.tokenExpiration !== 'number' || config.tokenExpiration <= 0)) {
        throw new ConfigurationError('tokenExpiration must be a positive number');
      }
    }
  }

  /**
   * Validate method instance after creation
   * @private
   * @param {AuthMethod} instance - Method instance to validate
   * @param {string} methodType - Method type
   * @throws {ConfigurationError} When instance is invalid
   */
  static _validateMethodInstance(instance, methodType) {
    if (!(instance instanceof AuthMethod)) {
      throw new ConfigurationError(
        `Method instance for '${methodType}' does not extend AuthMethod base class`
      );
    }

    // Verify required methods exist and are functions
    const requiredMethods = ['authenticate', 'setupBrowserContext', 'validateAuthentication', 'cleanup', 'getType'];
    
    for (const method of requiredMethods) {
      if (typeof instance[method] !== 'function') {
        throw new ConfigurationError(
          `Method instance for '${methodType}' is missing required method: ${method}`
        );
      }
    }

    // Verify getType returns expected value
    try {
      const instanceType = instance.getType();
      if (instanceType !== methodType) {
        console.warn(`Method instance getType() returns '${instanceType}' but expected '${methodType}'`);
      }
    } catch (error) {
      throw new ConfigurationError(
        `Method instance for '${methodType}' getType() method failed: ${error.message}`
      );
    }
  }

  /**
   * Load configuration from environment variables
   * @private
   * @returns {Object} Environment configuration
   */
  static _loadEnvironmentConfig() {
    return {
      baseURL: process.env.BASE_URL || this._defaultConfig.baseURL,
      persistStorageState: process.env.PERSIST_AUTH_STATE === 'true',
      storageStatePath: process.env.AUTH_STORAGE_PATH || this._defaultConfig.storageStatePath,
      fallbackToLogin: process.env.JWT_FALLBACK_LOGIN === 'true',
      tokenEndpoint: process.env.TOKEN_ENDPOINT || this._defaultConfig.tokenEndpoint,
      tokenExpiration: parseInt(process.env.TOKEN_EXPIRATION || '3600', 10),
      retryConfig: {
        maxRetries: parseInt(process.env.AUTH_MAX_RETRIES || '3', 10),
        backoffMultiplier: parseFloat(process.env.AUTH_BACKOFF_MULTIPLIER || '2'),
        initialDelay: parseInt(process.env.AUTH_RETRY_DELAY || '1000', 10)
      }
    };
  }

  /**
   * Wrap authentication method with retry capabilities
   * @private
   * @param {AuthMethod} method - Method to wrap
   * @returns {AuthMethod} Wrapped method with retry capabilities
   */
  static _wrapWithRetry(method) {
    return AuthErrorHandler.wrapWithRetry(method, method.config.retryConfig);
  }
}

module.exports = {
  AuthMethodFactory
};