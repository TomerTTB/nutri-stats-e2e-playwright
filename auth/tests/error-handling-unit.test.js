/**
 * Unit tests for authentication error handling and retry logic
 * These tests don't require Playwright browser setup
 */

const {
  AuthErrorHandler,
  NetworkAuthenticationError,
  JWTAuthenticationError,
  RetryExhaustedError,
  AuthenticationTimeoutError,
  InvalidCredentialsError
} = require('../errors/authentication-errors');

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
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected instance of ${expectedClass.name}, got ${actual.constructor.name}`);
        }
      },
      toThrow: async (expectedMessage) => {
        try {
          await actual();
          throw new Error('Expected function to throw, but it did not');
        } catch (error) {
          if (expectedMessage && !error.message.includes(expectedMessage)) {
            throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
          }
        }
      }
    };
  }
}

const runner = new SimpleTestRunner();

// Test retry logic with exponential backoff
runner.test('should retry network errors with exponential backoff', async () => {
  let attempts = 0;
  const maxRetries = 3;
  
  const operation = async () => {
    attempts++;
    if (attempts < maxRetries) {
      throw new NetworkAuthenticationError('Network timeout');
    }
    return 'success';
  };

  const retryConfig = {
    maxRetries: 3,
    initialDelay: 50,
    backoffMultiplier: 2
  };

  const startTime = Date.now();
  const result = await AuthErrorHandler.retryWithBackoff(operation, retryConfig, 'test operation');
  const endTime = Date.now();

  runner.expect(result).toBe('success');
  runner.expect(attempts).toBe(maxRetries);
  
  // Should have taken at least the retry delays (50ms + 100ms)
  runner.expect(endTime - startTime).toBeGreaterThan(140);
});

// Test non-retryable errors
runner.test('should not retry non-retryable errors', async () => {
  let attempts = 0;
  
  const operation = async () => {
    attempts++;
    const error = new InvalidCredentialsError('Invalid credentials');
    throw error;
  };

  const retryConfig = {
    maxRetries: 3,
    initialDelay: 50,
    backoffMultiplier: 2
  };

  await runner.expect(async () => {
    await AuthErrorHandler.retryWithBackoff(operation, retryConfig, 'test operation');
  }).toThrow('Invalid credentials');

  runner.expect(attempts).toBe(1); // Should not retry
});

// Test timeout handling
runner.test('should handle timeout errors', async () => {
  const operation = async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return 'success';
  };

  await runner.expect(async () => {
    await AuthErrorHandler.withTimeout(operation, 100, 'test operation');
  }).toThrow('timed out after 100ms');
});

// Test successful operation within timeout
runner.test('should complete operation within timeout', async () => {
  const operation = async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return 'success';
  };

  const result = await AuthErrorHandler.withTimeout(operation, 100, 'test operation');
  runner.expect(result).toBe('success');
});

// Test retryable error identification
runner.test('should identify retryable errors correctly', () => {
  // Retryable errors
  runner.expect(AuthErrorHandler.isRetryableError(
    new NetworkAuthenticationError('Network error')
  )).toBe(true);

  const networkError = new Error('Connection refused');
  networkError.code = 'ECONNREFUSED';
  runner.expect(AuthErrorHandler.isRetryableError(networkError)).toBe(true);

  // Non-retryable errors
  const credError = new InvalidCredentialsError('Invalid credentials');
  runner.expect(AuthErrorHandler.isRetryableError(credError)).toBe(false);
});

// Test RetryExhaustedError
runner.test('should throw RetryExhaustedError after max attempts', async () => {
  let attempts = 0;
  
  const operation = async () => {
    attempts++;
    throw new NetworkAuthenticationError('Persistent network error');
  };

  const retryConfig = {
    maxRetries: 2,
    initialDelay: 10,
    backoffMultiplier: 1.5
  };

  await runner.expect(async () => {
    await AuthErrorHandler.retryWithBackoff(operation, retryConfig, 'test operation');
  }).toThrow('failed after 2 attempts');

  runner.expect(attempts).toBe(2);
});

// Test error creation from API responses
runner.test('should create appropriate errors from API responses', () => {
  // 401 Unauthorized
  const unauthorizedResponse = { status: 401, data: { message: 'Invalid credentials' } };
  const unauthorizedError = AuthErrorHandler.createErrorFromResponse(unauthorizedResponse, 'login');
  runner.expect(unauthorizedError).toBeInstanceOf(InvalidCredentialsError);

  // 500 Server Error
  const serverErrorResponse = { status: 500, data: { message: 'Internal server error' } };
  const serverError = AuthErrorHandler.createErrorFromResponse(serverErrorResponse, 'authentication');
  runner.expect(serverError).toBeInstanceOf(NetworkAuthenticationError);

  // 429 Rate Limited
  const rateLimitResponse = { status: 429, data: { message: 'Too many requests' } };
  const rateLimitError = AuthErrorHandler.createErrorFromResponse(rateLimitResponse, 'authentication');
  runner.expect(rateLimitError.code).toBe('RATE_LIMITED');
});

// Test comprehensive retry wrapper
runner.test('should handle comprehensive retry with timeout and logging', async () => {
  let attempts = 0;
  
  const operation = async () => {
    attempts++;
    if (attempts < 2) {
      throw new NetworkAuthenticationError('Network error');
    }
    return 'success';
  };

  const config = {
    retryConfig: {
      maxRetries: 3,
      initialDelay: 10,
      backoffMultiplier: 1.5
    },
    timeoutMs: 1000
  };

  const result = await AuthErrorHandler.retryWithTimeoutAndLogging(
    operation, 
    config, 
    'test operation'
  );

  runner.expect(result).toBe('success');
  runner.expect(attempts).toBe(2);
});

// Run all tests
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;