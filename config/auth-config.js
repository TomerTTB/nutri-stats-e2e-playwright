/**
 * Authentication Configuration Validation and Environment Setup
 * 
 * This module provides validation for authentication-related environment variables,
 * default values, error handling, and storage state path validation.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Default configuration values for authentication
 */
const DEFAULT_CONFIG = {
  AUTH_STRATEGY: 'ui-login',
  BASE_URL: 'http://localhost:8080',
  AUTH_STORAGE_PATH: '.auth/user.json',
  PERSIST_AUTH_STATE: 'false',
  JWT_FALLBACK_LOGIN: 'false',
  TOKEN_ENDPOINT: '/api/auth/token',
  TOKEN_EXPIRATION: '3600',
  AUTH_MAX_RETRIES: '3',
  AUTH_RETRY_DELAY: '1000',
  AUTH_BACKOFF_MULTIPLIER: '2',
  CLEANUP_ENABLED: 'true'
};

/**
 * Valid values for specific configuration options
 */
const VALID_VALUES = {
  AUTH_STRATEGY: ['login', 'jwt', 'ui-login'],
  PERSIST_AUTH_STATE: ['true', 'false'],
  JWT_FALLBACK_LOGIN: ['true', 'false'],
  CLEANUP_ENABLED: ['true', 'false']
};

/**
 * Configuration validation errors
 */
class AuthConfigError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'AuthConfigError';
    this.field = field;
  }
}

/**
 * Authentication configuration manager
 */
class AuthConfig {
  constructor() {
    this.config = {};
    this.validated = false;
  }

  /**
   * Load and validate configuration from environment variables
   * @returns {Object} Validated configuration object
   */
  async load() {
    if (this.validated) {
      return this.config;
    }

    // Load configuration with defaults
    this.config = this._loadWithDefaults();
    
    // Validate configuration
    await this._validate();
    
    // Ensure required directories exist
    await this._ensureDirectories();
    
    this.validated = true;
    return this.config;
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @returns {string} Configuration value
   */
  get(key) {
    if (!this.validated) {
      throw new AuthConfigError('Configuration not loaded. Call load() first.');
    }
    return this.config[key];
  }

  /**
   * Check if JWT authentication is enabled
   * @returns {boolean} True if JWT authentication is enabled
   */
  isJWTAuth() {
    if (!this.validated) {
      // For immediate checks before full validation, use environment variable
      return (process.env.AUTH_STRATEGY || 'login') === 'jwt';
    }
    return this.get('AUTH_STRATEGY') === 'jwt';
  }

  /**
   * Get storage state path (absolute)
   * @returns {string} Absolute path to storage state file
   */
  getStorageStatePath() {
    const storagePath = this.validated ? 
      this.get('AUTH_STORAGE_PATH') : 
      (process.env.AUTH_STORAGE_PATH || DEFAULT_CONFIG.AUTH_STORAGE_PATH);
    return path.isAbsolute(storagePath) ? storagePath : path.resolve(storagePath);
  }

  /**
   * Get retry configuration object
   * @returns {Object} Retry configuration
   */
  getRetryConfig() {
    if (!this.validated) {
      return {
        maxRetries: parseInt(process.env.AUTH_MAX_RETRIES || DEFAULT_CONFIG.AUTH_MAX_RETRIES),
        initialDelay: parseInt(process.env.AUTH_RETRY_DELAY || DEFAULT_CONFIG.AUTH_RETRY_DELAY),
        backoffMultiplier: parseFloat(process.env.AUTH_BACKOFF_MULTIPLIER || DEFAULT_CONFIG.AUTH_BACKOFF_MULTIPLIER)
      };
    }
    return {
      maxRetries: parseInt(this.get('AUTH_MAX_RETRIES')),
      initialDelay: parseInt(this.get('AUTH_RETRY_DELAY')),
      backoffMultiplier: parseFloat(this.get('AUTH_BACKOFF_MULTIPLIER'))
    };
  }

  /**
   * Load configuration with default values
   * @private
   * @returns {Object} Configuration object
   */
  _loadWithDefaults() {
    const config = {};
    
    // Load each configuration key with default fallback
    for (const [key, defaultValue] of Object.entries(DEFAULT_CONFIG)) {
      config[key] = process.env[key] || defaultValue;
    }
    
    return config;
  }

  /**
   * Validate configuration values
   * @private
   */
  async _validate() {
    const errors = [];

    // Validate AUTH_STRATEGY
    if (!VALID_VALUES.AUTH_STRATEGY.includes(this.config.AUTH_STRATEGY)) {
      errors.push(new AuthConfigError(
        `Invalid AUTH_STRATEGY: ${this.config.AUTH_STRATEGY}. Must be one of: ${VALID_VALUES.AUTH_STRATEGY.join(', ')}`,
        'AUTH_STRATEGY'
      ));
    }

    // Validate BASE_URL format
    try {
      new URL(this.config.BASE_URL);
    } catch (error) {
      errors.push(new AuthConfigError(
        `Invalid BASE_URL format: ${this.config.BASE_URL}. Must be a valid URL.`,
        'BASE_URL'
      ));
    }

    // Validate boolean values
    for (const [key, validValues] of Object.entries(VALID_VALUES)) {
      if (key !== 'AUTH_STRATEGY' && !validValues.includes(this.config[key])) {
        errors.push(new AuthConfigError(
          `Invalid ${key}: ${this.config[key]}. Must be one of: ${validValues.join(', ')}`,
          key
        ));
      }
    }

    // Validate numeric values
    const numericFields = ['TOKEN_EXPIRATION', 'AUTH_MAX_RETRIES', 'AUTH_RETRY_DELAY', 'AUTH_BACKOFF_MULTIPLIER'];
    for (const field of numericFields) {
      const value = this.config[field];
      if (isNaN(Number(value)) || Number(value) < 0) {
        errors.push(new AuthConfigError(
          `Invalid ${field}: ${value}. Must be a positive number.`,
          field
        ));
      }
    }

    // Validate storage state path for JWT authentication
    if (this.config.AUTH_STRATEGY === 'jwt') {
      await this._validateStorageStatePath();
    }

    // Throw aggregated errors
    if (errors.length > 0) {
      const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join('\n');
      throw new AuthConfigError(`Configuration validation failed:\n${errorMessage}`);
    }
  }

  /**
   * Validate storage state path and permissions
   * @private
   */
  async _validateStorageStatePath() {
    const storagePath = this.config.AUTH_STORAGE_PATH;
    const absolutePath = path.isAbsolute(storagePath) ? storagePath : path.resolve(storagePath);
    const storageDir = path.dirname(absolutePath);

    try {
      // Check if directory exists or can be created
      await fs.mkdir(storageDir, { recursive: true });
      
      // Test write permissions by creating a temporary file
      const testFile = path.join(storageDir, '.test-write-permission');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
    } catch (error) {
      throw new AuthConfigError(
        `Storage state path validation failed: ${error.message}. Path: ${absolutePath}`,
        'AUTH_STORAGE_PATH'
      );
    }
  }

  /**
   * Ensure required directories exist
   * @private
   */
  async _ensureDirectories() {
    const directories = [];

    // Add storage state directory for JWT authentication
    if (this.config.AUTH_STRATEGY === 'jwt') {
      const storagePath = this.getStorageStatePath();
      directories.push(path.dirname(storagePath));
    }

    // Create directories
    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        throw new AuthConfigError(
          `Failed to create directory: ${dir}. Error: ${error.message}`
        );
      }
    }
  }

  /**
   * Generate configuration documentation
   * @returns {string} Configuration documentation
   */
  static generateDocumentation() {
    return `
# Authentication Configuration Environment Variables

## Authentication Strategy Selection

### AUTH_STRATEGY
- **Description**: Selects the authentication strategy for e2e tests
- **Values**: 'login' | 'jwt'
- **Default**: 'login'
- **Example**: AUTH_STRATEGY=jwt

## Base Configuration

### BASE_URL
- **Description**: Base URL for the application under test
- **Format**: Valid URL
- **Default**: 'http://localhost:8080'
- **Example**: BASE_URL=https://myapp.example.com

## JWT Authentication Configuration

### AUTH_STORAGE_PATH
- **Description**: Path to storage state file for JWT authentication
- **Format**: File path (relative or absolute)
- **Default**: '.auth/user.json'
- **Example**: AUTH_STORAGE_PATH=.auth/test-user.json

### PERSIST_AUTH_STATE
- **Description**: Whether to persist authentication state between test runs
- **Values**: 'true' | 'false'
- **Default**: 'true'
- **Example**: PERSIST_AUTH_STATE=false

### JWT_FALLBACK_LOGIN
- **Description**: Whether to fallback to login method if JWT authentication fails
- **Values**: 'true' | 'false'
- **Default**: 'false'
- **Example**: JWT_FALLBACK_LOGIN=true

## Token Configuration

### TOKEN_ENDPOINT
- **Description**: API endpoint for token authentication
- **Format**: URL path
- **Default**: '/api/auth/token'
- **Example**: TOKEN_ENDPOINT=/api/v1/auth/login

### TOKEN_EXPIRATION
- **Description**: Token expiration time in seconds
- **Format**: Positive integer
- **Default**: '3600'
- **Example**: TOKEN_EXPIRATION=7200

## Retry Configuration

### AUTH_MAX_RETRIES
- **Description**: Maximum number of authentication retries
- **Format**: Positive integer
- **Default**: '3'
- **Example**: AUTH_MAX_RETRIES=5

### AUTH_RETRY_DELAY
- **Description**: Initial retry delay in milliseconds
- **Format**: Positive integer
- **Default**: '1000'
- **Example**: AUTH_RETRY_DELAY=2000

### AUTH_BACKOFF_MULTIPLIER
- **Description**: Backoff multiplier for retry delays
- **Format**: Positive number
- **Default**: '2'
- **Example**: AUTH_BACKOFF_MULTIPLIER=1.5

## Test Management

### CLEANUP_ENABLED
- **Description**: Whether to enable test user cleanup after tests
- **Values**: 'true' | 'false'
- **Default**: 'true'
- **Example**: CLEANUP_ENABLED=false

## Usage Examples

### Basic JWT Authentication
\`\`\`bash
AUTH_STRATEGY=jwt
BASE_URL=http://localhost:8080
AUTH_STORAGE_PATH=.auth/user.json
\`\`\`

### JWT with Fallback and Custom Retry
\`\`\`bash
AUTH_STRATEGY=jwt
JWT_FALLBACK_LOGIN=true
AUTH_MAX_RETRIES=5
AUTH_RETRY_DELAY=2000
AUTH_BACKOFF_MULTIPLIER=1.5
\`\`\`

### Login Strategy (Default)
\`\`\`bash
AUTH_STRATEGY=login
BASE_URL=http://localhost:8080
CLEANUP_ENABLED=true
\`\`\`

## Troubleshooting

### Common Issues

1. **Storage State Path Errors**
   - Ensure the directory exists or can be created
   - Check write permissions for the storage state directory
   - Use absolute paths if relative paths cause issues

2. **Token Expiration Issues**
   - Increase TOKEN_EXPIRATION for longer test runs
   - Enable JWT_FALLBACK_LOGIN for automatic fallback

3. **Network Retry Issues**
   - Adjust AUTH_MAX_RETRIES and AUTH_RETRY_DELAY for unstable networks
   - Increase AUTH_BACKOFF_MULTIPLIER for more aggressive backoff

4. **Configuration Validation Errors**
   - Check that all boolean values are 'true' or 'false'
   - Ensure numeric values are positive numbers
   - Verify BASE_URL is a valid URL format
`;
  }
}

// Export singleton instance
const authConfig = new AuthConfig();

module.exports = {
  AuthConfig,
  AuthConfigError,
  authConfig,
  DEFAULT_CONFIG,
  VALID_VALUES
};