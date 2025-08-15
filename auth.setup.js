/**
 * Global authentication setup for JWT strategy
 * This file creates an authenticated user and saves the storage state
 * following Playwright's recommended approach for authentication
 */

const { chromium } = require('@playwright/test');
const { generateTestUser } = require('./utils/data-generators');
const ApiHelpers = require('./utils/api-helpers');
const { authConfig } = require('./config/auth-config');
const fs = require('fs').promises;
const path = require('path');

async function globalAuthSetup() {
  console.log('🔐 Starting global authentication setup...');
  
  try {
    // Load and validate configuration
    console.log('⚙️ Loading and validating authentication configuration...');
    const config = await authConfig.load();
    console.log(`✅ Configuration loaded. Strategy: ${config.AUTH_STRATEGY}`);
    
    // Generate test user data
    const userData = generateTestUser();
    const apiHelpers = new ApiHelpers();
    // Initialize API helpers
    await apiHelpers.init();
    
    // Register and login user via API
    console.log('👤 Creating test user...');
    const registerResponse = await apiHelpers.registerUser(userData);
    
    if (!registerResponse.ok) {
      throw new Error(`User registration failed: ${JSON.stringify(registerResponse.data)}`);
    }
    
    console.log('🔑 Logging in test user...');
    const loginResponse = await apiHelpers.loginUser({
      email: userData.email,
      password: userData.password
    });
    
    if (!loginResponse.ok || !loginResponse.data.token) {
      throw new Error(`User login failed: ${JSON.stringify(loginResponse.data)}`);
    }
    
    // Launch browser and create storage state
    console.log('🌐 Creating browser context and storage state...');
    const browser = await chromium.launch();
    const context = await browser.newContext({
      baseURL: authConfig.get('BASE_URL')
    });
    const page = await context.newPage();
    
    // Navigate to the application
    await page.goto('/');
    
    // Set authentication data in browser storage
    await page.evaluate((authData) => {
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, {
      token: loginResponse.data.token,
      user: loginResponse.data.user
    });
    
    // Verify authentication by navigating to a protected page
    await page.goto('/diary.html');
    await page.waitForLoadState('networkidle');
    
    // Verify we're not redirected to login
    if (page.url().includes('login.html')) {
      throw new Error('Authentication verification failed - redirected to login page');
    }
    
    // Save storage state
    const storageStatePath = authConfig.getStorageStatePath();
    const storageDir = path.dirname(storageStatePath);
    
    // Directory creation is handled by authConfig.load(), but ensure it exists
    await fs.mkdir(storageDir, { recursive: true });
    
    // Save the storage state
    await page.context().storageState({ path: storageStatePath });
    console.log(`💾 Storage state saved to: ${storageStatePath}`);
    
    // Close browser
    await browser.close();
    
    // Save user data for cleanup purposes
    const userDataPath = path.join(storageDir, 'user-data.json');
    const userDataForCleanup = {
      ...userData,
      token: loginResponse.data.token,
      user: loginResponse.data.user,
      createdAt: new Date().toISOString()
    };
    
    await fs.writeFile(userDataPath, JSON.stringify(userDataForCleanup, null, 2));
    console.log(`📝 User data saved for cleanup: ${userDataPath}`);
    
    // Cleanup API helpers
    await apiHelpers.cleanup();
    
    console.log('✅ Global authentication setup complete');
    
  } catch (error) {
    console.error('❌ Global authentication setup failed:', error);
    
    // Cleanup API helpers on error
    try {
      await apiHelpers.cleanup();
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup API helpers:', cleanupError.message);
    }
    
    throw error;
  }
}

module.exports = globalAuthSetup;