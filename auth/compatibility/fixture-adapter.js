/**
 * Fixture Adapter for Authentication Methods
 * Provides backward compatibility between new authentication methods and existing fixtures
 */

const { AuthMethodFactory } = require('../factory/auth-method-factory');
const { generateTestUser } = require('../../utils/data-generators');

/**
 * Fixture Adapter Class
 * Bridges the gap between new authentication methods and existing fixture patterns
 */
class FixtureAdapter {
  /**
   * Create authentication method based on environment or configuration
   * @param {Object} config - Configuration options
   * @returns {AuthMethod} Authentication method instance
   */
  static createAuthMethod(config = {}) {
    const strategy = process.env.AUTH_STRATEGY || config.strategy || 'login';
    const authConfig = {
      baseURL: process.env.BASE_URL || 'http://localhost:8080',
      ...config
    };

    return AuthMethodFactory.create(strategy, authConfig);
  }

  /**
   * Create test user fixture using authentication method
   * @param {AuthMethod} authMethod - Authentication method to use
   * @param {Object} userData - Optional user data overrides
   * @returns {Promise<Object>} Test user with authentication state
   */
  static async createTestUserFixture(authMethod, userData = {}) {
    const testUserData = generateTestUser(userData);
    const authState = await authMethod.authenticate(testUserData);

    return {
      ...testUserData,
      ...authState.user,
      token: authState.token,
      authState: authState,
      authMethod: authMethod
    };
  }

  /**
   * Create authenticated page fixture using authentication method
   * @param {import('@playwright/test').Page} page - Page object
   * @param {AuthMethod} authMethod - Authentication method to use
   * @param {Object} authState - Authentication state
   * @returns {Promise<import('@playwright/test').Page>} Authenticated page
   */
  static async createAuthenticatedPageFixture(page, authMethod, authState) {
    if (authMethod.getType() === 'jwt' && authMethod.supportsStorageState()) {
      // For JWT method, use storage state approach
      await authMethod.setupBrowserContext(page, authState);
    } else if (authMethod.getType() === 'login') {
      // For login method, use the createAuthenticatedPage method
      return await authMethod.createAuthenticatedPage(page, authState);
    } else {
      // Fallback to generic setup
      await authMethod.setupBrowserContext(page, authState);
    }

    return page;
  }

  /**
   * Create authenticated context fixture using authentication method
   * @param {import('@playwright/test').Browser} browser - Browser object
   * @param {AuthMethod} authMethod - Authentication method to use
   * @param {Object} authState - Authentication state
   * @returns {Promise<import('@playwright/test').BrowserContext>} Authenticated context
   */
  static async createAuthenticatedContextFixture(browser, authMethod, authState) {
    if (authMethod.getType() === 'jwt' && authMethod.supportsStorageState()) {
      // For JWT method with storage state, create context with storage state
      const storageStatePath = authMethod.storageStatePath || '.auth/user.json';
      
      try {
        return await browser.newContext({
          storageState: storageStatePath,
          ignoreHTTPSErrors: true,
          viewport: { width: 1280, height: 720 }
        });
      } catch (error) {
        // Fallback to manual setup if storage state fails
        console.warn('Storage state failed, falling back to manual setup:', error.message);
        return await this._createManualAuthContext(browser, authMethod, authState);
      }
    } else if (authMethod.getType() === 'login') {
      // For login method, use the createAuthenticatedContext method
      return await authMethod.createAuthenticatedContext(browser, authState);
    } else {
      // Fallback to manual setup
      return await this._createManualAuthContext(browser, authMethod, authState);
    }
  }

  /**
   * Create manual authentication context (fallback)
   * @private
   * @param {import('@playwright/test').Browser} browser - Browser object
   * @param {AuthMethod} authMethod - Authentication method
   * @param {Object} authState - Authentication state
   * @returns {Promise<import('@playwright/test').BrowserContext>} Authenticated context
   */
  static async _createManualAuthContext(browser, authMethod, authState) {
    const context = await browser.newContext({
      storageState: undefined,
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 720 }
    });

    await authMethod.setupBrowserContext(context, authState);
    return context;
  }

  /**
   * Cleanup authentication resources
   * @param {AuthMethod} authMethod - Authentication method
   * @param {Object} authState - Authentication state
   * @returns {Promise<void>}
   */
  static async cleanupAuthResources(authMethod, authState) {
    try {
      await authMethod.cleanup(authState);
    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('Cleanup failed:', error.message);
      }
      // Don't throw cleanup errors
    }
  }

  /**
   * Validate authentication state
   * @param {AuthMethod} authMethod - Authentication method
   * @param {Object} authState - Authentication state
   * @returns {Promise<boolean>} True if authentication is valid
   */
  static async validateAuthState(authMethod, authState) {
    try {
      return await authMethod.validateAuthentication(authState);
    } catch (error) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('Auth validation failed:', error.message);
      }
      return false;
    }
  }
}

module.exports = {
  FixtureAdapter
};