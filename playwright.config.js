const { defineConfig, devices } = require('@playwright/test');
const { authConfig } = require('./config/auth-config');

// Load environment variables from .env.test file
require('dotenv').config({ path: '.env.test' });

/**
 * @see https://playwright.dev/docs/test-configuration
 */

// Load and validate authentication configuration
let config;
try {
  // Note: We can't use async/await at module level, so we'll validate in globalSetup
  // For now, use basic validation for immediate config needs
  const authStrategy = process.env.AUTH_STRATEGY || 'login';
  const isJWTAuth = authStrategy === 'jwt';
  
  // Basic validation
  if (!['login', 'jwt', 'ui-login'].includes(authStrategy)) {
    throw new Error(`Invalid AUTH_STRATEGY: ${authStrategy}. Must be 'login', 'jwt', or 'ui-login'`);
  }
  
  config = { authStrategy, isJWTAuth };
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  process.exit(1);
}

// Conditional global setup based on authentication strategy
const getGlobalSetup = () => {
  if (config.isJWTAuth) {
    return require.resolve('./auth.setup.js');
  }
  return require.resolve('./global-setup.js');
};

module.exports = defineConfig({
  testDir: './tests',
  
  /* Global setup and teardown - conditional based on auth strategy */
  globalSetup: getGlobalSetup(),
  globalTeardown: require.resolve('./global-teardown.js'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-artifacts/reports/html-report' }],
    ['json', { outputFile: 'test-artifacts/reports/test-results.json' }],
    ['junit', { outputFile: 'test-artifacts/reports/junit.xml' }],
    ['./monitoring/performance-reporter.js']
  ],
  /* Output directory for test artifacts - videos, traces, etc. */
  outputDir: 'test-artifacts/videos',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:8080',

    /* Storage state for JWT authentication - conditional based on auth strategy */
    ...(config.isJWTAuth && {
      storageState: process.env.AUTH_STORAGE_PATH || '.auth/user.json'
    }),

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on all tests to include in reports */
    screenshot: 'on',
    
    /* Record video only on failures */
    // video: 'retain-on-failure',
    video: 'on',
    
    /* Global timeout for each test */
    actionTimeout: 10000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for JWT authentication - runs auth.setup.js
    ...(config.isJWTAuth ? [{
      name: 'setup',
      testMatch: /.*\.setup\.js/
    }] : []),
    
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Add dependency on setup project for JWT authentication
      ...(config.isJWTAuth && {
        dependencies: ['setup']
      })
    }
    // },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});