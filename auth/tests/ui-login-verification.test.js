/**
 * Test to verify UI login method is working correctly and not using JWT
 */

const { UILoginAuthMethod } = require('../methods/ui-login-auth-method');
const { generateTestUser } = require('../../utils/data-generators');

// Simple test runner
class SimpleTestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log(`Running ${this.tests.length} tests...\n`);

    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected null, got ${actual}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, got ${actual}`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected falsy value, got ${actual}`);
        }
      }
    };
  }
}

const runner = new SimpleTestRunner();

// Test UI login method initialization
runner.test('should create UI login method with correct type', async () => {
  const config = {
    baseURL: 'http://localhost:8080'
  };
  
  const uiLoginMethod = new UILoginAuthMethod(config);
  
  runner.expect(uiLoginMethod.getType()).toBe('ui-login');
  runner.expect(uiLoginMethod.supportsStorageState()).toBeFalsy();
});

// Test authentication state creation (without actual login)
runner.test('should create auth state without token initially', async () => {
  const config = {
    baseURL: 'http://localhost:8080'
  };
  
  const uiLoginMethod = new UILoginAuthMethod(config);
  const userData = generateTestUser();
  
  // Mock the API helpers to avoid actual API calls
  uiLoginMethod.apiHelpers = {
    init: async () => {},
    registerUser: async () => ({ ok: true, data: { id: 'test-user-id' } }),
    cleanup: async () => {}
  };
  
  const authState = await uiLoginMethod.authenticate(userData);
  
  // Verify auth state structure
  runner.expect(authState.strategy).toBe('ui-login');
  runner.expect(authState.token).toBeNull(); // Should be null initially
  runner.expect(authState.needsUILogin).toBeTruthy(); // Should need UI login
  runner.expect(authState.user.email).toBe(userData.email);
  runner.expect(authState.userData.email).toBe(userData.email);
});

// Test validation with needsUILogin flag
runner.test('should return false for validation when UI login is needed', async () => {
  const config = {
    baseURL: 'http://localhost:8080'
  };
  
  const uiLoginMethod = new UILoginAuthMethod(config);
  
  const authState = {
    strategy: 'ui-login',
    token: null,
    user: { email: 'test@example.com' },
    needsUILogin: true
  };
  
  const isValid = await uiLoginMethod.validateAuthentication(authState);
  runner.expect(isValid).toBeFalsy();
});

// Test validation after UI login (with token)
runner.test('should return true for validation when UI login is complete', async () => {
  const config = {
    baseURL: 'http://localhost:8080',
    validateWithAPI: false // Disable API validation for this test
  };
  
  const uiLoginMethod = new UILoginAuthMethod(config);
  
  const authState = {
    strategy: 'ui-login',
    token: 'test-token-from-ui-login',
    user: { email: 'test@example.com' },
    needsUILogin: false
  };
  
  const isValid = await uiLoginMethod.validateAuthentication(authState);
  runner.expect(isValid).toBeTruthy();
});

// Test that UI login method doesn't use JWT-specific features
runner.test('should not have JWT-specific features', async () => {
  const config = {
    baseURL: 'http://localhost:8080'
  };
  
  const uiLoginMethod = new UILoginAuthMethod(config);
  
  // Should not support storage state (JWT feature)
  runner.expect(uiLoginMethod.supportsStorageState()).toBeFalsy();
  
  // Should have ui-login strategy, not jwt
  runner.expect(uiLoginMethod.getType()).toBe('ui-login');
  
  // Default config should not have JWT-specific settings
  const defaultConfig = UILoginAuthMethod.getDefaultConfig();
  runner.expect(defaultConfig.strategy).toBe('ui-login');
  runner.expect(defaultConfig.persistStorageState).toBeFalsy();
});

// Run all tests
if (require.main === module) {
  // Set debug mode for this test
  process.env.DEBUG_AUTH = 'true';
  
  console.log('🧪 Testing UI Login Authentication Method');
  console.log('========================================\n');
  
  runner.run().then(success => {
    if (success) {
      console.log('\n🎉 All UI login tests passed! The method is working correctly and not using JWT.');
    } else {
      console.log('\n❌ Some tests failed. Check the implementation.');
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;