/**
 * JWT Authentication Method
 * Implements JWT token-based authentication following Playwright's recommended patterns
 */

const { AuthMethod } = require('../interfaces/auth-method.interface');
const {
  JWTAuthenticationError,
  TokenValidationError,
  StorageStateError,
  BrowserContextError,
  NetworkAuthenticationError,
  AuthErrorHandler
} = require('../errors/authentication-errors');
const ApiHelpers = require('../../utils/api-helpers');
const fs = require('fs').promises;
const path = require('path');

/**
 * JWT Authentication Method Class
 * Provides JWT token-based authentication with storage state management
 */
class JWTAuthMethod extends AuthMethod {
  /**
   * Constructor for JWT authentication method
   * @param {AuthConfig} config - Authentication configuration
   */
  constructor(config) {
    super(config);
    this.apiHelpers = new ApiHelpers(config.baseURL);
    this.storageStatePath = config.storageStatePath || '.auth/user.json';
    this.userDataPath = path.join(path.dirname(this.storageStatePath), 'user-data.json');
  }

  /**
   * Get authentication method type
   * @returns {string} Authentication method type
   */
  getType() {
    return 'jwt';
  }

  /**
   * Check if authentication method supports storage state
   * @returns {boolean} True if supports storage state
   */
  supportsStorageState() {
    return true;
  }  /**

   * Authenticate user and return authentication state
   * @param {Object} credentials - User credentials
   * @returns {Promise<AuthState>} Authentication state
   * @throws {JWTAuthenticationError} When authentication fails
   */
  async authenticate(credentials) {
    const operation = async () => {
      try {
        await this.apiHelpers.init();

        // Register user if needed (for test scenarios)
        const registerResponse = await this._registerUserWithErrorHandling(credentials);

        // Login to get JWT token
        const loginResponse = await this._loginUserWithErrorHandling(credentials);

        // Create authentication state
        const authState = {
          token: loginResponse.data.token,
          user: loginResponse.data.user,
          strategy: 'jwt',
          expiresAt: this._calculateTokenExpiration(loginResponse.data.token),
          createdAt: new Date().toISOString()
        };

        // Validate token
        await this._validateToken(authState.token);

        return authState;

      } catch (error) {
        if (error instanceof JWTAuthenticationError) {
          throw error;
        }

        // Handle network errors
        if (this._isNetworkError(error)) {
          throw new NetworkAuthenticationError(
            `Network error during authentication: ${error.message}`,
            error,
            { credentials: { ...credentials, password: '[REDACTED]' } }
          );
        }

        throw new JWTAuthenticationError(
          `Authentication failed: ${error.message}`,
          'AUTHENTICATION_FAILED',
          error,
          { credentials: { ...credentials, password: '[REDACTED]' } }
        );
      } finally {
        await this.apiHelpers.cleanup();
      }
    };

    // Apply retry logic if configured
    if (this.config.retryConfig && this.config.retryConfig.maxRetries > 0) {
      return AuthErrorHandler.retryWithBackoff(operation, this.config.retryConfig, 'JWT authentication');
    }

    return operation();
  }  
/**
   * Setup browser context with JWT authentication
   * For JWT method, this is typically handled by storage state at context level
   * @param {import('@playwright/test').BrowserContext|import('@playwright/test').Page} context - Browser context or page
   * @param {AuthState} authState - Authentication state
   * @returns {Promise<void>}
   */
  async setupBrowserContext(context, authState) {
    const operation = async () => {
      try {
        // For JWT method, authentication is typically handled by storage state
        // This method is called when storage state is not used or for fallback scenarios
        
        if (context.goto) {
          // This is a page object
          await this._setupPageAuthentication(context, authState);
        } else {
          // This is a browser context - storage state should handle authentication
          // But we can validate that authentication is working
          const page = await context.newPage();
          await this._setupPageAuthentication(page, authState);
          await page.close();
        }

      } catch (error) {
        throw new BrowserContextError(
          `Failed to setup browser context with JWT authentication: ${error.message}`,
          error,
          { authState: { ...authState, token: '[REDACTED]' } }
        );
      }
    };

    // Apply timeout and retry logic if configured
    const timeoutMs = this.config.setupTimeout || 30000; // 30 second default
    
    if (this.config.retryConfig && this.config.retryConfig.maxRetries > 0) {
      const retryOperation = () => AuthErrorHandler.retryWithBackoff(operation, this.config.retryConfig, 'browser context setup');
      return AuthErrorHandler.withTimeout(retryOperation, timeoutMs, 'browser context setup');
    }

    return AuthErrorHandler.withTimeout(operation, timeoutMs, 'browser context setup');
  }

  /**
   * Setup page-level authentication (fallback when storage state is not used)
   * @private
   * @param {import('@playwright/test').Page} page - Page object
   * @param {AuthState} authState - Authentication state
   */
  async _setupPageAuthentication(page, authState) {
    // Navigate to application
    await page.goto('/');

    // Set authentication data in browser storage
    await page.evaluate((authData) => {
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, {
      token: authState.token,
      user: authState.user
    });

    // Verify authentication by navigating to protected page
    await page.goto('/diary.html');
    await page.waitForLoadState('networkidle');

    // Check if we're redirected to login (authentication failed)
    if (page.url().includes('login.html')) {
      throw new JWTAuthenticationError(
        'JWT authentication verification failed - redirected to login page',
        'AUTH_VERIFICATION_FAILED'
      );
    }
  }

  /**
   * Validate authentication state
   * @param {AuthState} authState - Authentication state to validate
   * @returns {Promise<boolean>} True if authentication is valid
   */
  async validateAuthentication(authState) {
    const operation = async () => {
      try {
        if (!authState || !authState.token || !authState.user) {
          return false;
        }

        // Check token expiration
        if (authState.expiresAt && new Date(authState.expiresAt) <= new Date()) {
          return false;
        }

        // Validate token format and structure
        await this._validateToken(authState.token);

        // Optionally validate with API (can be expensive, so make it configurable)
        if (this.config.validateWithAPI !== false) {
          return await this._validateTokenWithAPI(authState.token);
        }

        return true;

      } catch (error) {
        if (process.env.DEBUG_AUTH === 'true') {
          console.warn('JWT validation failed:', error.message);
        }
        
        // For retryable errors, throw them so retry logic can handle
        if (AuthErrorHandler.isRetryableError(error)) {
          throw error;
        }
        
        return false;
      }
    };

    // Apply retry logic for API validation if configured
    if (this.config.validateWithAPI !== false && 
        this.config.retryConfig && 
        this.config.retryConfig.maxRetries > 0) {
      try {
        return await AuthErrorHandler.retryWithBackoff(operation, this.config.retryConfig, 'JWT validation');
      } catch (error) {
        if (process.env.DEBUG_AUTH === 'true') {
          console.warn('JWT validation failed after retries:', error.message);
        }
        return false;
      }
    }

    return operation();
  }

  /**
   * Cleanup authentication resources
   * @param {AuthState} authState - Authentication state to cleanup
   * @returns {Promise<void>}
   */
  async cleanup(authState) {
    try {
      // Clean up user data if cleanup is enabled
      if (process.env.CLEANUP_ENABLED !== 'false' && authState?.user?.id) {
        await this._cleanupUserData(authState);
      }

      // Clean up storage state files if configured
      if (this.config.cleanupStorageState !== false) {
        await this._cleanupStorageState();
      }

    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('JWT cleanup failed:', error.message);
      }
      // Don't throw cleanup errors as they shouldn't fail tests
    }
  }  
/**
   * Create storage state for Playwright
   * @param {string} token - JWT token
   * @param {Object} user - User object
   * @returns {Promise<Object>} Storage state object
   */
  async createStorageState(token, user) {
    try {
      return {
        cookies: [],
        origins: [
          {
            origin: this.config.baseURL,
            localStorage: [
              { name: 'authToken', value: token },
              { name: 'user', value: JSON.stringify(user) }
            ]
          }
        ]
      };
    } catch (error) {
      throw new StorageStateError(
        `Failed to create storage state: ${error.message}`,
        error,
        { token: '[REDACTED]', user }
      );
    }
  }

  /**
   * Save storage state to file
   * @param {AuthState} authState - Authentication state
   * @returns {Promise<string>} Path to saved storage state file
   */
  async saveStorageState(authState) {
    try {
      const storageState = await this.createStorageState(authState.token, authState.user);
      const storageDir = path.dirname(this.storageStatePath);

      // Ensure directory exists
      await fs.mkdir(storageDir, { recursive: true });

      // Save storage state
      await fs.writeFile(this.storageStatePath, JSON.stringify(storageState, null, 2));

      // Save user data for cleanup
      const userDataForCleanup = {
        ...authState,
        token: '[REDACTED]' // Don't persist token in user data file
      };
      await fs.writeFile(this.userDataPath, JSON.stringify(userDataForCleanup, null, 2));

      return this.storageStatePath;

    } catch (error) {
      throw new StorageStateError(
        `Failed to save storage state: ${error.message}`,
        error,
        { storageStatePath: this.storageStatePath }
      );
    }
  }  /**
   
* Load storage state from file
   * @returns {Promise<Object|null>} Storage state object or null if not found
   */
  async loadStorageState() {
    try {
      await fs.access(this.storageStatePath);
      const storageStateContent = await fs.readFile(this.storageStatePath, 'utf8');
      return JSON.parse(storageStateContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw new StorageStateError(
        `Failed to load storage state: ${error.message}`,
        error,
        { storageStatePath: this.storageStatePath }
      );
    }
  }

  /**
   * Check if storage state exists and is valid
   * @returns {Promise<boolean>} True if storage state exists and is valid
   */
  async hasValidStorageState() {
    try {
      const storageState = await this.loadStorageState();
      if (!storageState) {
        return false;
      }

      // Basic validation of storage state structure
      if (!storageState.origins || !Array.isArray(storageState.origins)) {
        return false;
      }

      const origin = storageState.origins.find(o => o.origin === this.config.baseURL);
      if (!origin || !origin.localStorage) {
        return false;
      }

      const authToken = origin.localStorage.find(item => item.name === 'authToken');
      const user = origin.localStorage.find(item => item.name === 'user');

      return !!(authToken && authToken.value && user && user.value);

    } catch (error) {
      return false;
    }
  }  /**

   * Validate JWT token format and structure
   * @private
   * @param {string} token - JWT token to validate
   * @throws {TokenValidationError} When token is invalid
   */
  async _validateToken(token) {
    if (!token || typeof token !== 'string') {
      throw new TokenValidationError('Token is required and must be a string');
    }

    // Basic JWT format validation (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new TokenValidationError('Invalid JWT format - must have 3 parts separated by dots');
    }

    try {
      // Validate that parts are base64 encoded
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      // Basic header validation
      if (!header.alg || !header.typ) {
        throw new TokenValidationError('Invalid JWT header - missing algorithm or type');
      }

      // Basic payload validation - be more flexible with user identifier
      if (!payload.sub && !payload.user_id && !payload.userId && !payload.id && !payload.username && !payload.email) {
        throw new TokenValidationError('Invalid JWT payload - missing user identifier');
      }

      // Check expiration if present
      if (payload.exp && payload.exp * 1000 <= Date.now()) {
        throw new TokenValidationError('JWT token has expired');
      }

    } catch (error) {
      if (error instanceof TokenValidationError) {
        throw error;
      }
      throw new TokenValidationError(`JWT validation failed: ${error.message}`, error);
    }
  }

  /**
   * Validate token with API
   * @private
   * @param {string} token - JWT token to validate
   * @returns {Promise<boolean>} True if token is valid
   */
  async _validateTokenWithAPI(token) {
    try {
      const apiHelpers = new ApiHelpers(this.config.baseURL);
      await apiHelpers.init();
      apiHelpers.setAuthToken(token);

      const response = await apiHelpers.getCurrentUser();
      await apiHelpers.cleanup();

      return response.ok;

    } catch (error) {
      throw new NetworkAuthenticationError(
        `API token validation failed: ${error.message}`,
        error
      );
    }
  }  /**

   * Calculate token expiration date
   * @private
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date or null if not available
   */
  _calculateTokenExpiration(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      if (payload.exp) {
        return new Date(payload.exp * 1000);
      }

      // Fallback to configured expiration
      if (this.config.tokenExpiration) {
        return new Date(Date.now() + this.config.tokenExpiration * 1000);
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Cleanup user data via API
   * @private
   * @param {AuthState} authState - Authentication state
   */
  async _cleanupUserData(authState) {
    try {
      const apiHelpers = new ApiHelpers(this.config.baseURL);
      await apiHelpers.init();
      apiHelpers.setAuthToken(authState.token);

      await apiHelpers.cleanupUserData();
      await apiHelpers.cleanup();

    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('Failed to cleanup user data via API:', error.message);
      }
    }
  }

  /**
   * Cleanup storage state files
   * @private
   */
  async _cleanupStorageState() {
    try {
      // Remove storage state file
      await fs.unlink(this.storageStatePath).catch(() => {});
      
      // Remove user data file
      await fs.unlink(this.userDataPath).catch(() => {});

    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('Failed to cleanup storage state files:', error.message);
      }
    }
  }

  /**
   * Register user with comprehensive error handling
   * @private
   * @param {Object} credentials - User credentials
   * @returns {Promise<Object>} Registration response
   * @throws {JWTAuthenticationError} When registration fails
   */
  async _registerUserWithErrorHandling(credentials) {
    try {
      const registerResponse = await this.apiHelpers.registerUser(credentials);
      
      if (!registerResponse.ok) {
        // Create appropriate error based on response
        const error = AuthErrorHandler.createErrorFromResponse(registerResponse, 'user registration');
        throw new JWTAuthenticationError(
          `User registration failed: ${error.message}`,
          'USER_REGISTRATION_FAILED',
          error,
          { credentials: { ...credentials, password: '[REDACTED]' }, response: registerResponse }
        );
      }

      return registerResponse;

    } catch (error) {
      if (error instanceof JWTAuthenticationError) {
        throw error;
      }

      // Handle network errors
      if (this._isNetworkError(error)) {
        throw new NetworkAuthenticationError(
          `Network error during user registration: ${error.message}`,
          error,
          { credentials: { ...credentials, password: '[REDACTED]' } }
        );
      }

      throw new JWTAuthenticationError(
        `User registration failed: ${error.message}`,
        'USER_REGISTRATION_FAILED',
        error,
        { credentials: { ...credentials, password: '[REDACTED]' } }
      );
    }
  }

  /**
   * Login user with comprehensive error handling
   * @private
   * @param {Object} credentials - User credentials
   * @returns {Promise<Object>} Login response
   * @throws {JWTAuthenticationError} When login fails
   */
  async _loginUserWithErrorHandling(credentials) {
    try {
      const loginResponse = await this.apiHelpers.loginUser({
        email: credentials.email,
        password: credentials.password
      });

      if (!loginResponse.ok || !loginResponse.data.token) {
        // Create appropriate error based on response
        const error = AuthErrorHandler.createErrorFromResponse(loginResponse, 'JWT token acquisition');
        throw new JWTAuthenticationError(
          `JWT token acquisition failed: ${error.message}`,
          'TOKEN_ACQUISITION_FAILED',
          error,
          { credentials: { ...credentials, password: '[REDACTED]' }, response: loginResponse }
        );
      }

      return loginResponse;

    } catch (error) {
      if (error instanceof JWTAuthenticationError) {
        throw error;
      }

      // Handle network errors
      if (this._isNetworkError(error)) {
        throw new NetworkAuthenticationError(
          `Network error during login: ${error.message}`,
          error,
          { credentials: { ...credentials, password: '[REDACTED]' } }
        );
      }

      throw new JWTAuthenticationError(
        `Login failed: ${error.message}`,
        'LOGIN_FAILED',
        error,
        { credentials: { ...credentials, password: '[REDACTED]' } }
      );
    }
  }

  /**
   * Check if error is a network-related error
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is network-related
   */
  _isNetworkError(error) {
    // Check for common network error indicators
    if (error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'EHOSTUNREACH') {
      return true;
    }

    // Check for fetch/axios network errors
    if (error.message && (
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('connection') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('fetch failed'))) {
      return true;
    }

    // Check for HTTP status codes that indicate network issues
    if (error.response && error.response.status) {
      const networkStatusCodes = [408, 502, 503, 504];
      return networkStatusCodes.includes(error.response.status);
    }

    return false;
  }

  /**
   * Get default configuration for JWT authentication method
   * @returns {Partial<AuthConfig>} Default configuration
   */
  static getDefaultConfig() {
    return {
      ...AuthMethod.getDefaultConfig(),
      strategy: 'jwt',
      persistStorageState: true,
      storageStatePath: '.auth/user.json',
      validateWithAPI: true,
      cleanupStorageState: true,
      tokenExpiration: 3600 // 1 hour default
    };
  }
}

module.exports = {
  JWTAuthMethod
};