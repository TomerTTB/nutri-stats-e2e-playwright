/**
 * Test suite for authentication error handling and retry logic
 */

const { test, expect } = require('@playwright/test');
const {
  AuthMethodFactory,
  JWTAuthMethod,
  FallbackAuthMethod,
  AuthErrorHandler,
  NetworkAuthenticationError,
  JWTAuthenticationError,
  RetryExhaustedError
} = require('../index');

test.describe('Authentication Error Handling', () => {
  
  test('should handle JWT authentication errors with fallback', async () => {
    const config = {
      baseURL: 'http://localhost:8080',
      fallbackToLogin: true,
      retryConfig: {
        maxRetries: 2,
        initialDelay: 100,
        backoffMultiplier: 1.5
      }
    };

    // Create fallback method
    const fallbackMethod = AuthMethodFactory.createWithFallback('jwt', 'login', config);
    
    expect(fallbackMethod).toBeInstanceOf(FallbackAuthMethod);
    expect(fallbackMethod.getType()).toContain('fallback');
  });

  test('should retry network errors with exponential backoff', async () => {
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

    expect(result).toBe('success');
    expect(attempts).toBe(maxRetries);
    
    // Should have taken at least the retry delays (50ms + 100ms)
    expect(endTime - startTime).toBeGreaterThan(140);
  });

  test('should not retry non-retryable errors', async () => {
    let attempts = 0;
    
    const operation = async () => {
      attempts++;
      const error = new JWTAuthenticationError('Invalid credentials');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    };

    const retryConfig = {
      maxRetries: 3,
      initialDelay: 50,
      backoffMultiplier: 2
    };

    await expect(
      AuthErrorHandler.retryWithBackoff(operation, retryConfig, 'test operation')
    ).rejects.toThrow('Invalid credentials');

    expect(attempts).toBe(1); // Should not retry
  });

  test('should handle timeout errors', async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return 'success';
    };

    await expect(
      AuthErrorHandler.withTimeout(operation, 100, 'test operation')
    ).rejects.toThrow('timed out after 100ms');
  });

  test('should complete operation within timeout', async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'success';
    };

    const result = await AuthErrorHandler.withTimeout(operation, 100, 'test operation');
    expect(result).toBe('success');
  });

  test('should identify retryable errors correctly', () => {
    // Retryable errors
    expect(AuthErrorHandler.isRetryableError(
      new NetworkAuthenticationError('Network error')
    )).toBe(true);

    const networkError = new Error('Connection refused');
    networkError.code = 'ECONNREFUSED';
    expect(AuthErrorHandler.isRetryableError(networkError)).toBe(true);

    // Non-retryable errors
    const credError = new Error('Invalid credentials');
    credError.code = 'INVALID_CREDENTIALS';
    expect(AuthErrorHandler.isRetryableError(credError)).toBe(false);
  });

  test('should throw RetryExhaustedError after max attempts', async () => {
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

    await expect(
      AuthErrorHandler.retryWithBackoff(operation, retryConfig, 'test operation')
    ).rejects.toThrow(RetryExhaustedError);

    expect(attempts).toBe(2);
  });

  test('should create appropriate errors from API responses', () => {
    // 401 Unauthorized
    const unauthorizedResponse = { status: 401, data: { message: 'Invalid credentials' } };
    const unauthorizedError = AuthErrorHandler.createErrorFromResponse(unauthorizedResponse, 'login');
    expect(unauthorizedError.code).toBe('INVALID_CREDENTIALS');

    // 500 Server Error
    const serverErrorResponse = { status: 500, data: { message: 'Internal server error' } };
    const serverError = AuthErrorHandler.createErrorFromResponse(serverErrorResponse, 'authentication');
    expect(serverError).toBeInstanceOf(NetworkAuthenticationError);

    // 429 Rate Limited
    const rateLimitResponse = { status: 429, data: { message: 'Too many requests' } };
    const rateLimitError = AuthErrorHandler.createErrorFromResponse(rateLimitResponse, 'authentication');
    expect(rateLimitError.code).toBe('RATE_LIMITED');
  });

});

test.describe('JWT Method Error Handling Integration', () => {
  
  test('should handle network errors during authentication', async () => {
    const config = {
      baseURL: 'http://invalid-host:9999', // This should cause network errors
      retryConfig: {
        maxRetries: 2,
        initialDelay: 50,
        backoffMultiplier: 1.5
      }
    };

    const jwtMethod = new JWTAuthMethod(config);
    const credentials = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser'
    };

    // This should fail with network error and retry
    await expect(
      jwtMethod.authenticate(credentials)
    ).rejects.toThrow();
  });

});