/**
 * UI Login Authentication Method
 * Implements actual browser UI-based login authentication where you can see email/password entry
 * This method performs the login through the actual login form in the browser
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
 * UI Login Authentication Method Class
 * Provides actual browser UI-based login authentication
 */
class UILoginAuthMethod extends AuthMethod {
  /**
   * Constructor for UI login authentication method
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
    return 'ui-login';
  }

  /**
   * Check if authentication method supports storage state
   * @returns {boolean} False - UI login method uses manual authentication
   */
  supportsStorageState() {
    return false;
  }

  /**
   * Authenticate user and return authentication state
   * This method registers the user via API but doesn't perform login yet
   * @param {Object} credentials - User credentials
   * @returns {Promise<AuthState>} Authentication state
   * @throws {LoginAuthenticationError} When authentication fails
   */
  async authenticate(credentials) {
    try {
      await this.apiHelpers.init();

      // Use provided credentials or generate test user
      const userData = credentials || generateTestUser();

      // Register user via API (we still need to create the user)
      const registerResponse = await this.apiHelpers.registerUser(userData);
      if (!registerResponse.ok) {
        throw new LoginAuthenticationError(
          `User registration failed: ${JSON.stringify(registerResponse.data)}`,
          'USER_REGISTRATION_FAILED',
          null,
          { credentials: { ...userData, password: '[REDACTED]' }, response: registerResponse }
        );
      }

      // Create authentication state with user data (no token yet - will be obtained via UI)
      const authState = {
        token: null, // Will be set after UI login
        user: {
          id: registerResponse.data.id || registerResponse.data.user?.id,
          username: userData.username,
          email: userData.email,
          name: userData.name
        },
        strategy: 'ui-login',
        createdAt: new Date().toISOString(),
        userData: userData, // Keep original user data for UI login
        needsUILogin: true // Flag to indicate UI login is required
      };

      return authState;

    } catch (error) {
      if (error instanceof LoginAuthenticationError) {
        throw error;
      }

      throw new LoginAuthenticationError(
        `Authentication preparation failed: ${error.message}`,
        'AUTHENTICATION_PREP_FAILED',
        error,
        { credentials: credentials ? { ...credentials, password: '[REDACTED]' } : null }
      );
    } finally {
      await this.apiHelpers.cleanup();
    }
  }

  /**
   * Setup browser context with UI login authentication
   * This method performs the actual browser-based login through the UI
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

      // Navigate to login page
      await page.goto('/login.html');
      await page.waitForLoadState('networkidle');

      if (process.env.DEBUG_AUTH === 'true') {
        console.log('🔐 Starting UI login process...');
        console.log(`📧 Email: ${authState.userData.email}`);
        console.log(`🔑 Password: [HIDDEN]`);
      }

      // Fill in the login form with correct selectors
      await page.fill('#login-email', authState.userData.email);
      await page.fill('#login-password', authState.userData.password);

      if (process.env.DEBUG_AUTH === 'true') {
        console.log('✍️ Filled login form, clicking login button...');
      }

      // Click login button and wait for navigation
      // The login button is a submit button with text "Login"
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]:has-text("Login")')
      ]);

      if (process.env.DEBUG_AUTH === 'true') {
        console.log(`🌐 After login, current URL: ${page.url()}`);
      }

      // Check if login was successful (should not be on login page)
      if (page.url().includes('login.html')) {
        throw new LoginAuthenticationError(
          'UI login failed - still on login page after form submission',
          'UI_LOGIN_FAILED',
          null,
          { 
            currentUrl: page.url(),
            authState: { ...authState, userData: { ...authState.userData, password: '[REDACTED]' } }
          }
        );
      }

      // Get the authentication token from localStorage (set by the app after successful login)
      const authData = await page.evaluate(() => {
        return {
          token: localStorage.getItem('authToken'),
          user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
        };
      });

      if (!authData.token) {
        throw new LoginAuthenticationError(
          'UI login failed - no authentication token found in localStorage after login',
          'UI_LOGIN_NO_TOKEN',
          null,
          { authData, currentUrl: page.url() }
        );
      }

      // Update auth state with token obtained from UI login
      authState.token = authData.token;
      authState.needsUILogin = false;

      if (process.env.DEBUG_AUTH === 'true') {
        console.log('✅ UI login successful! Token obtained.');
      }

      // Navigate to diary to verify authentication
      await page.goto('/diary.html');
      await page.waitForLoadState('networkidle');

      // Verify we're not redirected back to login
      if (page.url().includes('login.html')) {
        throw new LoginAuthenticationError(
          'UI login verification failed - redirected to login page when accessing protected page',
          'UI_LOGIN_VERIFICATION_FAILED',
          null,
          { currentUrl: page.url() }
        );
      }

      if (process.env.DEBUG_AUTH === 'true') {
        console.log('✅ UI login verification successful!');
      }

      // Close the page if we created it
      if (shouldClosePage) {
        await page.close();
      }

    } catch (error) {
      if (error instanceof LoginAuthenticationError) {
        throw error;
      }

      throw new BrowserContextError(
        `Failed to setup browser context with UI login authentication: ${error.message}`,
        error,
        { authState: { ...authState, userData: { ...authState.userData, password: '[REDACTED]' } } }
      );
    }
  }

  /**
   * Validate authentication state
   * @param {AuthState} authState - Authentication state to validate
   * @returns {Promise<boolean>} True if authentication is valid
   */
  async validateAuthentication(authState) {
    try {
      if (!authState || !authState.user) {
        return false;
      }

      // If UI login is still needed, it's not valid yet
      if (authState.needsUILogin) {
        return false;
      }

      // If we have a token, validate it
      if (authState.token) {
        if (this.config.validateWithAPI !== false) {
          return await this._validateTokenWithAPI(authState.token);
        }
        return true;
      }

      return false;

    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('UI login authentication validation failed:', error.message);
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
      // Clean up user data if cleanup is enabled and we have a token
      if (process.env.CLEANUP_ENABLED !== 'false' && authState?.token && authState?.user?.id) {
        await this._cleanupUserData(authState);
      }

    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('UI login authentication cleanup failed:', error.message);
      }
      // Don't throw cleanup errors as they shouldn't fail tests
    }
  }

  /**
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

      await apiHelpers.cleanupUserData();
      await apiHelpers.cleanup();

    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('Failed to cleanup user data via API:', error.message);
      }
    }
  }

  /**
   * Get default configuration for UI login authentication method
   * @returns {Partial<AuthConfig>} Default configuration
   */
  static getDefaultConfig() {
    return {
      ...AuthMethod.getDefaultConfig(),
      strategy: 'ui-login',
      persistStorageState: false,
      validateWithAPI: true,
      fallbackToLogin: false
    };
  }
}

module.exports = {
  UILoginAuthMethod
};