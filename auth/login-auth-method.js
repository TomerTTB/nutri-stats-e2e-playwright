/**
 * Login authentication method
 * Implements UI-based login authentication approach (current implementation)
 */

const { AuthMethod, AuthenticationError, AuthenticationRetryError } = require('./auth-method-interface');
const ApiHelpers = require('../utils/api-helpers');
const { generateTestUser } = require('../utils/data-generators');

/**
 * Login authentication method class
 * Maintains existing behavior for UI-based login approach
 */
class LoginAuthMethod extends AuthMethod {
  /**
   * Create LoginAuthMethod instance
   * @param {Object} config - Authentication configuration
   */
  constructor(config = {}) {
    super(config);
    this.apiHelpers = new ApiHelpers(config.baseURL);
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      ...config.retryConfig
    };
  }

  /**
   * Authenticate user using login approach
   * @param {Object} credentials - User credentials
   * @returns {Promise<AuthState>} Authentication state
   */
  async authenticate(credentials) {
    try {
      await this.apiHelpers.init();

      // If no credentials provided, generate test user
      const userData = credentials || generateTestUser();

      // Register the test user if credentials were generated
      if (!credentials) {
        const registerResponse = await this.registerUserWithRetry(userData);
        
        if (!registerResponse.ok) {
          throw new AuthenticationError(
            `Failed to register test user: ${JSON.stringify(registerResponse.data)}`,
            'REGISTRATION_FAILED'
          );
        }

        // Update userData with registration response data
        userData.id = registerResponse.data.id || registerResponse.data.user?.id;
      }

      // Login to get auth token
      const loginResponse = await this.loginUserWithRetry({
        email: userData.email,
        password: userData.password
      });

      if (!loginResponse.ok) {
        throw new AuthenticationError(
          `Failed to login user: ${JSON.stringify(loginResponse.data)}`,
          'LOGIN_FAILED'
        );
      }

      const authState = {
        token: loginResponse.data.token,
        user: {
          id: userData.id || loginResponse.data.user?.id,
          username: userData.username || loginResponse.data.user?.username,
          email: userData.email || loginResponse.data.user?.email,
          ...loginResponse.data.user
        },
        method: 'login',
        credentials: userData // Store for cleanup
      };

      // Set auth token in API helpers for future requests
      this.apiHelpers.setAuthToken(authState.token);

      return authState;

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Authentication failed: ${error.message}`,
        'AUTH_FAILED',
        error
      );
    }
  }

  /**
   * Setup browser context with authentication state
   * @param {import('@playwright/test').Page} page - Browser page
   * @param {AuthState} authState - Authentication state
   * @returns {Promise<void>}
   */
  async setupBrowserContext(page, authState) {
    try {
      // Navigate to base URL first
      await page.goto('/');

      // Set authentication token in localStorage
      await page.evaluate((authData) => {
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
      }, {
        token: authState.token,
        user: authState.user
      });

      // Navigate to protected page to verify authentication
      await page.goto('/diary.html');
      await page.waitForLoadState('networkidle');

      // Verify we're not redirected to login page
      const currentUrl = page.url();
      if (currentUrl.includes('login.html')) {
        throw new AuthenticationError(
          'Authentication setup failed - redirected to login page',
          'AUTH_SETUP_FAILED'
        );
      }

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Browser context setup failed: ${error.message}`,
        'CONTEXT_SETUP_FAILED',
        error
      );
    }
  }

  /**
   * Validate authentication state
   * @param {AuthState} authState - Authentication state to validate
   * @returns {Promise<boolean>} Whether authentication state is valid
   */
  async validateAuthentication(authState) {
    try {
      if (!authState || !authState.token || !authState.user) {
        return false;
      }

      // Ensure API helpers is initialized
      if (!this.apiHelpers.requestContext) {
        await this.apiHelpers.init();
      }

      // Set auth token and verify with API
      this.apiHelpers.setAuthToken(authState.token);
      const profileResponse = await this.apiHelpers.getCurrentUser();

      return profileResponse.ok && !!profileResponse.data;

    } catch (error) {
      console.warn('Authentication validation failed:', error.message);
      return false;
    }
  }

  /**
   * Cleanup authentication resources
   * @param {AuthState} authState - Authentication state to cleanup
   * @returns {Promise<void>}
   */
  async cleanup(authState) {
    if (!authState || process.env.CLEANUP_ENABLED === 'false') {
      return;
    }

    try {
      // Set auth token for cleanup operations
      if (authState.token) {
        this.apiHelpers.setAuthToken(authState.token);
      }

      // Cleanup user data with timeout to prevent hanging
      const cleanupPromise = this.apiHelpers.cleanupUserData();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cleanup timeout')), 5000)
      );

      await Promise.race([cleanupPromise, timeoutPromise]);

    } catch (error) {
      // Silently ignore cleanup errors - they don't affect test results
      if (process.env.DEBUG_CLEANUP === 'true') {
        console.warn('Failed to cleanup authentication resources:', error.message);
      }
    } finally {
      // Always cleanup API helpers
      try {
        await this.apiHelpers.cleanup();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Register user with retry logic
   * @param {Object} userData - User data for registration
   * @returns {Promise<Object>} Registration response
   * @private
   */
  async registerUserWithRetry(userData) {
    return await this.executeWithRetry(
      () => this.apiHelpers.registerUser(userData),
      'User registration'
    );
  }

  /**
   * Login user with retry logic
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} Login response
   * @private
   */
  async loginUserWithRetry(credentials) {
    return await this.executeWithRetry(
      () => this.apiHelpers.loginUser(credentials),
      'User login'
    );
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {string} operationName - Name of operation for error messages
   * @returns {Promise<any>} Operation result
   * @private
   */
  async executeWithRetry(operation, operationName) {
    const { maxRetries, initialDelay, backoffMultiplier } = this.retryConfig;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // If operation succeeded, return result
        if (result.ok) {
          return result;
        }

        // If it's the last attempt or a non-retryable error, throw
        if (attempt === maxRetries || this.isNonRetryableError(result)) {
          throw new AuthenticationError(
            `${operationName} failed after ${attempt} attempts: ${JSON.stringify(result.data)}`,
            'OPERATION_FAILED'
          );
        }

        lastError = new Error(`${operationName} failed: ${JSON.stringify(result.data)}`);

      } catch (error) {
        lastError = error;

        // If it's the last attempt, throw retry exhausted error
        if (attempt === maxRetries) {
          throw new AuthenticationRetryError(
            `${operationName} failed after ${maxRetries} attempts`,
            maxRetries,
            lastError
          );
        }

        // If it's a non-retryable error, throw immediately
        if (this.isNonRetryableError(error)) {
          throw error;
        }
      }

      // Wait before next attempt with exponential backoff
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but just in case
    throw new AuthenticationRetryError(
      `${operationName} failed after ${maxRetries} attempts`,
      maxRetries,
      lastError
    );
  }

  /**
   * Check if error is non-retryable
   * @param {Error|Object} error - Error to check
   * @returns {boolean} Whether error is non-retryable
   * @private
   */
  isNonRetryableError(error) {
    // Don't retry on authentication errors (wrong credentials, etc.)
    if (error instanceof AuthenticationError) {
      return true;
    }

    // Don't retry on 4xx client errors (except 429 rate limiting)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return true;
    }

    // Don't retry on validation errors
    if (error.data && error.data.message && error.data.message.includes('validation')) {
      return true;
    }

    return false;
  }

  /**
   * Get method name
   * @returns {string} Method name
   */
  getMethodName() {
    return 'login';
  }
}

module.exports = LoginAuthMethod;