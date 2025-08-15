/**
 * Authentication fixtures for login/logout states and user management
 * Provides user authentication fixtures, test user creation/cleanup utilities,
 * and browser context/storage management fixtures
 * 
 * Supports both login and JWT authentication strategies based on AUTH_STRATEGY environment variable
 */

const { test: base, expect } = require('@playwright/test');
const ApiHelpers = require('../utils/api-helpers');
const { generateTestUser } = require('../utils/data-generators');
// Import auth module to register methods
require('../auth');
const { AuthMethodFactory } = require('../auth/factory/auth-method-factory');
const { FixtureAdapter } = require('../auth/compatibility/fixture-adapter');
const fs = require('fs').promises;

/**
 * Authentication fixture that provides authenticated user context
 * Supports both login and JWT authentication strategies
 */
const authFixture = base.extend({
  /**
   * Storage state fixture - handles Playwright's storage state loading for JWT authentication
   * This fixture provides the storage state path for JWT authentication or undefined for login
   * Note: This fixture doesn't use Playwright's built-in storageState but manages it manually
   */
  storageState: async ({ }, use) => {
    // Always return undefined to prevent Playwright from trying to read storage state files
    // We handle storage state manually in the context and page fixtures
    await use(undefined);
  },

  /**
   * Authentication method fixture - creates the appropriate auth method based on configuration
   */
  authMethod: async ({ }, use) => {
    const authStrategy = process.env.AUTH_STRATEGY || 'login';
    const config = {
      baseURL: process.env.BASE_URL || 'http://localhost:8080',
      storageStatePath: process.env.AUTH_STORAGE_PATH || '.auth/user.json',
      fallbackToLogin: process.env.JWT_FALLBACK_LOGIN === 'true',
      persistStorageState: process.env.PERSIST_AUTH_STATE === 'true',
      validateWithAPI: process.env.JWT_VALIDATE_API !== 'false'
    };
    
    const method = AuthMethodFactory.create(authStrategy, config);
    await use(method);
  },

  /**
   * API helpers instance for authentication operations
   */
  apiHelpers: async ({ }, use) => {
    const apiHelpers = new ApiHelpers();
    await apiHelpers.init();
    await use(apiHelpers);
    await apiHelpers.cleanup();
  },

  /**
   * Test user fixture - creates and manages test user lifecycle
   * Works with both login and JWT authentication methods
   */
  testUser: async ({ authMethod }, use) => {
    const authStrategy = process.env.AUTH_STRATEGY || 'login';
    
    // Create user and authenticate for both methods
    const userData = generateTestUser();
    let authState = null;

    try {
      authState = await authMethod.authenticate(userData);
      
      const testUser = {
        ...userData,
        ...authState.user,
        token: authState.token,
        authState: authState
      };

      await use(testUser);

    } finally {
      // Cleanup: delete the test user if it was created
      if (authState && process.env.CLEANUP_ENABLED !== 'false') {
        try {
          await FixtureAdapter.cleanupAuthResources(authMethod, authState);
        } catch (error) {
          if (process.env.DEBUG_CLEANUP === 'true') {
            console.warn('Failed to cleanup test user:', error.message);
          }
        }
      }
    }
  },

  /**
   * Authenticated page fixture - provides page with logged-in user context
   * Supports JWT, login, and ui-login authentication methods
   */
  authenticatedPage: async ({ page, testUser, authMethod }, use) => {
    const authStrategy = process.env.AUTH_STRATEGY || 'login';
    
    if (authStrategy === 'jwt') {
      // For JWT method, set up authentication manually since we're not using global storage state
      await page.goto('/');

      await page.evaluate((authData) => {
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('user', JSON.stringify({
          id: authData.id || 'test-user-id',
          username: authData.username || 'testuser',
          email: authData.email || 'test@example.com'
        }));
      }, testUser);

      // Navigate to a protected page to verify authentication
      await page.goto('/diary.html');
      await page.waitForLoadState('networkidle');
      
      // Verify we're not redirected to login
      expect(page.url()).not.toContain('login.html');
    } else if (authStrategy === 'ui-login') {
      // For ui-login method, use the auth method to setup browser context
      await authMethod.setupBrowserContext(page, testUser.authState);
      
      // Verify we're on a protected page after UI login
      expect(page.url()).not.toContain('login.html');
    } else {
      // For login method, setup authentication manually
      await page.goto('/');

      await page.evaluate((authData) => {
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('user', JSON.stringify({
          id: authData.id || 'test-user-id',
          username: authData.username || 'testuser',
          email: authData.email || 'test@example.com'
        }));
      }, testUser);

      // Navigate to a protected page to verify authentication
      await page.goto('/diary.html');
      await page.waitForLoadState('networkidle');

      // Verify we're not redirected to login
      expect(page.url()).not.toContain('login.html');
    }

    await use(page);
  },

  /**
   * Clean browser context fixture - provides isolated browser context
   */
  cleanContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      // Clear all storage
      storageState: undefined,
      // Disable cache
      ignoreHTTPSErrors: true,
      // Set viewport
      viewport: { width: 1280, height: 720 }
    });

    await use(context);
    await context.close();
  },

  /**
   * Authenticated context fixture - provides browser context with auth state
   * Supports JWT, login, and ui-login authentication methods
   */
  authenticatedContext: async ({ browser, testUser, authMethod }, use) => {
    const authStrategy = process.env.AUTH_STRATEGY || 'login';
    let context;

    if (authStrategy === 'jwt') {
      // For JWT method, create storage state and use it
      try {
        const storageStateData = await authMethod.createStorageState(testUser.token, testUser);
        
        context = await browser.newContext({
          storageState: storageStateData,
          ignoreHTTPSErrors: true,
          viewport: { width: 1280, height: 720 }
        });
      } catch (error) {
        console.warn('JWT storage state failed, falling back to manual setup:', error.message);
        // Fallback to manual setup
        context = await browser.newContext({
          storageState: undefined,
          ignoreHTTPSErrors: true,
          viewport: { width: 1280, height: 720 }
        });
        await authMethod.setupBrowserContext(context, testUser.authState);
      }
    } else if (authStrategy === 'ui-login') {
      // For ui-login method, create context and use auth method to setup
      context = await browser.newContext({
        storageState: undefined,
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 720 }
      });

      // Use the auth method to setup browser context with UI login
      await authMethod.setupBrowserContext(context, testUser.authState);
    } else {
      // For login method, create context and setup authentication manually
      context = await browser.newContext({
        storageState: undefined,
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 720 }
      });

      // Create a page to set up authentication state
      const setupPage = await context.newPage();
      await setupPage.goto('/');

      // Set authentication data in storage
      await setupPage.evaluate((userData) => {
        localStorage.setItem('authToken', userData.token);
        localStorage.setItem('user', JSON.stringify({
          id: userData.id,
          username: userData.username,
          email: userData.email
        }));
      }, testUser);

      await setupPage.close();
    }

    await use(context);
    await context.close();
  }
});

/**
 * User management utilities for test setup and cleanup
 */
class UserManager {
  constructor(apiHelpers) {
    this.apiHelpers = apiHelpers;
    this.createdUsers = [];
  }

  /**
   * Create a test user with optional custom data
   * @param {Object} userData - Custom user data (optional)
   * @returns {Object} Created user data with auth token
   */
  async createTestUser(userData = {}) {
    const testUserData = generateTestUser(userData);

    try {
      // Register user
      const registerResponse = await this.apiHelpers.registerUser(testUserData);

      if (!registerResponse.ok) {
        throw new Error(`Failed to register user: ${JSON.stringify(registerResponse.data)}`);
      }

      // Login to get token
      const loginResponse = await this.apiHelpers.loginUser({
        email: testUserData.email,
        password: testUserData.password
      });

      if (!loginResponse.ok) {
        throw new Error(`Failed to login user: ${JSON.stringify(loginResponse.data)}`);
      }

      const createdUser = {
        ...testUserData,
        id: registerResponse.data.id || registerResponse.data.user?.id,
        token: loginResponse.data.token,
        ...registerResponse.data
      };

      this.createdUsers.push(createdUser);
      return createdUser;

    } catch (error) {
      console.error('Error creating test user:', error);
      throw error;
    }
  }

  /**
   * Create multiple test users
   * @param {number} count - Number of users to create
   * @param {Object} baseUserData - Base user data for all users
   * @returns {Array} Array of created user data
   */
  async createMultipleTestUsers(count = 3, baseUserData = {}) {
    const users = [];

    for (let i = 0; i < count; i++) {
      const userData = {
        ...baseUserData,
        username: `${baseUserData.username || 'testuser'}_${i}_${Date.now()}`,
        email: `test${i}_${Date.now()}@example.com`
      };

      const user = await this.createTestUser(userData);
      users.push(user);
    }

    return users;
  }

  /**
   * Login user and return authentication state
   * @param {Object} credentials - Login credentials
   * @returns {Object} Authentication state
   */
  async loginUser(credentials) {
    const loginResponse = await this.apiHelpers.loginUser(credentials);

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.data)}`);
    }

    return {
      token: loginResponse.data.token,
      user: loginResponse.data.user,
      isAuthenticated: true
    };
  }

  /**
   * Logout user
   * @returns {Object} Logout response
   */
  async logoutUser() {
    const logoutResponse = await this.apiHelpers.logoutUser();
    return logoutResponse;
  }

  /**
   * Delete a specific user
   * @param {string} userId - User ID to delete
   * @returns {Object} Delete response
   */
  async deleteUser(userId) {
    return await this.apiHelpers.deleteUser(userId);
  }

  /**
   * Cleanup all created test users
   */
  async cleanupAllUsers() {
    const cleanupResults = [];

    for (const user of this.createdUsers) {
      try {
        // Set auth token for the user
        this.apiHelpers.setAuthToken(user.token);

        // Cleanup user data
        const cleanupResult = await this.apiHelpers.cleanupUserData();
        cleanupResults.push({
          userId: user.id,
          username: user.username,
          success: true,
          result: cleanupResult
        });

      } catch (error) {
        console.warn(`Failed to cleanup user ${user.username}:`, error.message);
        cleanupResults.push({
          userId: user.id,
          username: user.username,
          success: false,
          error: error.message
        });
      }
    }

    this.createdUsers = [];
    return cleanupResults;
  }

  /**
   * Get current user profile
   * @returns {Object} User profile data
   */
  async getCurrentUserProfile() {
    const profileResponse = await this.apiHelpers.getCurrentUser();

    if (!profileResponse.ok) {
      throw new Error(`Failed to get user profile: ${JSON.stringify(profileResponse.data)}`);
    }

    return profileResponse.data;
  }

  /**
   * Verify user authentication status
   * @param {string} token - Auth token to verify
   * @returns {boolean} Authentication status
   */
  async verifyAuthentication(token) {
    try {
      if (!token) {
        return false;
      }
      
      this.apiHelpers.setAuthToken(token);
      const profileResponse = await this.apiHelpers.getCurrentUser();
      
      // Check if response is ok and has user data
      if (profileResponse.ok && profileResponse.data) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Authentication verification failed:', error.message);
      return false;
    }
  }
}

/**
 * Browser storage management utilities
 */
class StorageManager {
  constructor(page) {
    this.page = page;
  }

  /**
   * Set authentication state in browser storage
   * @param {Object} authState - Authentication state data
   */
  async setAuthState(authState) {
    await this.page.evaluate((state) => {
      if (state.token) {
        localStorage.setItem('authToken', state.token);
      }

      if (state.user) {
        localStorage.setItem('user', JSON.stringify(state.user));
      }

      if (state.sessionData) {
        for (const [key, value] of Object.entries(state.sessionData)) {
          sessionStorage.setItem(key, JSON.stringify(value));
        }
      }
    }, authState);
  }

  /**
   * Get authentication state from browser storage
   * @returns {Object} Current authentication state
   */
  async getAuthState() {
    return await this.page.evaluate(() => {
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      return {
        token,
        user,
        isAuthenticated: !!(token && user)
      };
    });
  }

  /**
   * Clear all authentication data from storage
   */
  async clearAuthState() {
    await this.page.evaluate(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      sessionStorage.clear();
    });
  }

  /**
   * Clear all browser storage
   */
  async clearAllStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Save current storage state
   * @returns {Object} Current storage state
   */
  async saveStorageState() {
    return await this.page.evaluate(() => {
      const localStorage_data = {};
      const sessionStorage_data = {};

      // Save localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        localStorage_data[key] = localStorage.getItem(key);
      }

      // Save sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        sessionStorage_data[key] = sessionStorage.getItem(key);
      }

      return {
        localStorage: localStorage_data,
        sessionStorage: sessionStorage_data
      };
    });
  }

  /**
   * Restore storage state
   * @param {Object} storageState - Previously saved storage state
   */
  async restoreStorageState(storageState) {
    await this.page.evaluate((state) => {
      // Clear existing storage
      localStorage.clear();
      sessionStorage.clear();

      // Restore localStorage
      if (state.localStorage) {
        for (const [key, value] of Object.entries(state.localStorage)) {
          localStorage.setItem(key, value);
        }
      }

      // Restore sessionStorage
      if (state.sessionStorage) {
        for (const [key, value] of Object.entries(state.sessionStorage)) {
          sessionStorage.setItem(key, value);
        }
      }
    }, storageState);
  }

  /**
   * Verify authentication state in storage
   * @returns {boolean} Whether user appears to be authenticated
   */
  async verifyAuthStateInStorage() {
    const authState = await this.getAuthState();
    return authState.isAuthenticated;
  }
}

module.exports = {
  authFixture,
  UserManager,
  StorageManager
};