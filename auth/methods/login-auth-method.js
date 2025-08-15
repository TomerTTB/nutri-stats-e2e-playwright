/**
 * Login Authentication Method
 * Implements UI-based login authentication following the existing approach
 * Maintains backward compatibility with current authentication fixtures
 */

const { AuthMethod } = require('../interfaces/auth-method.interface');
const {
  LoginAuthenticationError,
  InvalidCredentialsError,
  NetworkAuthenticationError,
  BrowserContextError,
  AuthErrorHandler
} = require('../errors/authentication-errors');
const ApiHelpers = require('../../utils/api-helpers');
const { generateTestUser } = require('../../utils/data-generators');

/**
 * Login Authentication Method Class
 * Provides UI-based login authentication with backward compatibility
 */
class LoginAuthMethod extends AuthMethod {
  /**
   * Constructor for login authentication method
   * @param {AuthConfig} config - Authentication configuration
   */
  constructor(config) {
    super(config);
    this.apiHelpers = new ApiHelpers(config.baseURL);
  }

  /**
   * Get authentication method type
   * @returns {string} Authentication method type
   */
  getType() {
    return 'login';
  }

  /**
   * Check if authentication method supports storage state
   * @returns {boolean} False - login method uses manual authentication
   */
  supportsStorageState() {
    return false;
  }  /**
  
 * Authenticate user and return authentication state
   * @param {Object} credentials - User credentials
   * @returns {Promise<AuthState>} Authentication state
   * @throws {LoginAuthenticationError} When authentication fails
   */
  async authenticate(credentials) {
    try {
      await this.apiHelpers.init();

      // Use provided credentials or generate test user
      const userData = credentials || generateTestUser();

      // Register user if needed (for test scenarios)
      const registerResponse = await this.apiHelpers.registerUser(userData);
      if (!registerResponse.ok) {
        throw new LoginAuthenticationError(
          `User registration failed: ${JSON.stringify(registerResponse.data)}`,
          'USER_REGISTRATION_FAILED',
          null,
          { credentials: { ...userData, password: '[REDACTED]' }, response: registerResponse }
        );
      }

      // Login to get authentication token
      const loginResponse = await this.apiHelpers.loginUser({
        email: userData.email,
        password: userData.password
      });

      if (!loginResponse.ok || !loginResponse.data.token) {
        throw new LoginAuthenticationError(
          `Login failed: ${JSON.stringify(loginResponse.data)}`,
          'LOGIN_FAILED',
          null,
          { credentials: { ...userData, password: '[REDACTED]' }, response: loginResponse }
        );
      }

      // Create authentication state
      const authState = {
        token: loginResponse.data.token,
        user: {
          id: registerResponse.data.id || registerResponse.data.user?.id,
          username: userData.username,
          email: userData.email,
          name: userData.name,
          ...loginResponse.data.user
        },
        strategy: 'login',
        createdAt: new Date().toISOString(),
        userData: userData // Keep original user data for cleanup
      };

      return authState;

    } catch (error) {
      if (error instanceof LoginAuthenticationError) {
        throw error;
      }

      throw new LoginAuthenticationError(
        `Authentication failed: ${error.message}`,
        'AUTHENTICATION_FAILED',
        error,
        { credentials: credentials ? { ...credentials, password: '[REDACTED]' } : null }
      );
    } finally {
      await this.apiHelpers.cleanup();
    }
  }  /**
   *
 Setup browser context with login authentication
   * This method performs the actual browser-based authentication setup
   * @param {import('@playwright/test').BrowserContext|import('@playwright/test').Page} context - Browser context or page
   * @param {AuthState} authState - Authentication state from authenticate method
   * @returns {Promise<void>}
   */
  async setupBrowserContext(context, authState) {
    try {
      let page;
      let shouldClosePage = false;

      // Determine if we have a page or context
      if (context.goto) {
        // This is a page object
        page = context;
      } else {
        // This is a browser context - create a page
        page = await context.newPage();
        shouldClosePage = true;
      }

      // Navigate to application root
      await page.goto('/');

      // Set authentication data in browser storage
      await page.evaluate((authData) => {
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
      }, {
        token: authState.token,
        user: authState.user
      });

      // Navigate to a protected page to verify authentication
      await page.goto('/diary.html');
      await page.waitForLoadState('networkidle');

      // Verify we're not redirected to login (authentication successful)
      if (page.url().includes('login.html')) {
        throw new LoginAuthenticationError(
          'Login authentication verification failed - redirected to login page',
          'AUTH_VERIFICATION_FAILED',
          null,
          { authState: { ...authState, token: '[REDACTED]' } }
        );
      }

      // Close the page if we created it
      if (shouldClosePage) {
        await page.close();
      }

    } catch (error) {
      throw new BrowserContextError(
        `Failed to setup browser context with login authentication: ${error.message}`,
        error,
        { authState: { ...authState, token: '[REDACTED]' } }
      );
    }
  }  /**

   * Validate authentication state
   * @param {AuthState} authState - Authentication state to validate
   * @returns {Promise<boolean>} True if authentication is valid
   */
  async validateAuthentication(authState) {
    try {
      if (!authState || !authState.token || !authState.user) {
        return false;
      }

      // Validate with API if configured
      if (this.config.validateWithAPI !== false) {
        return await this._validateTokenWithAPI(authState.token);
      }

      // Basic validation - check if we have required fields
      return !!(authState.token && authState.user && authState.user.email);

    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('Login authentication validation failed:', error.message);
      }
      return false;
    }
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

    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('Login authentication cleanup failed:', error.message);
      }
      // Don't throw cleanup errors as they shouldn't fail tests
    }
  }  /**

   * Create authenticated page (backward compatibility method)
   * This method provides the same functionality as the authenticatedPage fixture
   * @param {import('@playwright/test').Page} page - Page object
   * @param {AuthState} authState - Authentication state
   * @returns {Promise<import('@playwright/test').Page>} Authenticated page
   */
  async createAuthenticatedPage(page, authState) {
    try {
      // Set authentication token in localStorage
      await page.goto('/');

      await page.evaluate((authData) => {
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
      }, {
        token: authState.token,
        user: authState.user
      });

      // Navigate to a protected page to verify authentication
      await page.goto('/diary.html');
      await page.waitForLoadState('networkidle');

      // Verify we're not redirected to login
      if (page.url().includes('login.html')) {
        throw new LoginAuthenticationError(
          'Failed to create authenticated page - redirected to login',
          'AUTH_PAGE_SETUP_FAILED'
        );
      }

      return page;

    } catch (error) {
      throw new BrowserContextError(
        `Failed to create authenticated page: ${error.message}`,
        error,
        { authState: { ...authState, token: '[REDACTED]' } }
      );
    }
  }

  /**
   * Create authenticated browser context (backward compatibility method)
   * This method provides the same functionality as the authenticatedContext fixture
   * @param {import('@playwright/test').Browser} browser - Browser object
   * @param {AuthState} authState - Authentication state
   * @returns {Promise<import('@playwright/test').BrowserContext>} Authenticated context
   */
  async createAuthenticatedContext(browser, authState) {
    try {
      const context = await browser.newContext({
        storageState: undefined,
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 720 }
      });

      // Create a setup page to configure authentication
      const setupPage = await context.newPage();
      await setupPage.goto('/');

      // Set authentication data in storage
      await setupPage.evaluate((authData) => {
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
      }, {
        token: authState.token,
        user: authState.user
      });

      await setupPage.close();
      return context;

    } catch (error) {
      throw new BrowserContextError(
        `Failed to create authenticated context: ${error.message}`,
        error,
        { authState: { ...authState, token: '[REDACTED]' } }
      );
    }
  }  /**

   * Validate token with API
   * @private
   * @param {string} token - Authentication token to validate
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

      // Use the comprehensive cleanup method from ApiHelpers
      await apiHelpers.cleanupUserData();
      await apiHelpers.cleanup();

    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('Failed to cleanup user data via API:', error.message);
      }
    }
  }

  /**
   * Get default configuration for login authentication method
   * @returns {Partial<AuthConfig>} Default configuration
   */
  static getDefaultConfig() {
    return {
      ...AuthMethod.getDefaultConfig(),
      strategy: 'login',
      persistStorageState: false,
      validateWithAPI: true,
      fallbackToLogin: false // This IS the login method
    };
  }

  /**
   * Validate configuration for login authentication method
   * @param {AuthConfig} config - Configuration to validate
   * @throws {ConfigurationError} When configuration is invalid
   */
  static validateConfig(config) {
    // Call parent validation
    AuthMethod.validateConfig(config);

    // Login method specific validation
    if (config.strategy && config.strategy !== 'login') {
      throw new Error(`Invalid strategy for LoginAuthMethod: ${config.strategy}. Expected 'login'.`);
    }
  }
}

module.exports = {
  LoginAuthMethod
};