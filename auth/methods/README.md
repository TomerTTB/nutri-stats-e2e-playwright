# Authentication Methods

This directory contains implementations of different authentication strategies for the e2e testing framework.

## Available Methods

### JWT Authentication Method (`JWTAuthMethod`)

The `JWTAuthMethod` class provides JWT token-based authentication following Playwright's recommended patterns for authentication.

**Features:**
- JWT token-based authentication
- Storage state management for Playwright
- Token validation and expiration handling
- Fallback authentication for edge cases
- Automatic cleanup of test resources
- Error handling with retry logic

### Login Authentication Method (`LoginAuthMethod`)

The `LoginAuthMethod` class provides UI-based login authentication that maintains backward compatibility with existing authentication fixtures.

**Features:**
- API-based user registration and login
- Browser storage management (localStorage)
- Backward compatibility with existing fixtures
- Manual authentication setup for each test
- Comprehensive cleanup of test resources
- Error handling with retry logic

## Usage

### Basic Usage

```javascript
const { AuthMethodFactory } = require('../auth');

// Create JWT authentication method
const jwtAuth = AuthMethodFactory.create('jwt', {
  baseURL: 'http://localhost:8080',
  storageStatePath: '.auth/user.json',
  persistStorageState: true
});

// Create Login authentication method
const loginAuth = AuthMethodFactory.create('login', {
  baseURL: 'http://localhost:8080'
});

// Authenticate user
const authState = await jwtAuth.authenticate({
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123'
});

// Setup browser context
await jwtAuth.setupBrowserContext(page, authState);

// Validate authentication
const isValid = await jwtAuth.validateAuthentication(authState);

// Cleanup resources
await jwtAuth.cleanup(authState);
```

### Environment-based Configuration

```javascript
// Set environment variable
process.env.AUTH_STRATEGY = 'jwt'; // or 'login'

// Create method from environment
const authMethod = AuthMethodFactory.createFromEnvironment({
  baseURL: 'http://localhost:8080'
});
```

### Fixture Compatibility

The `FixtureAdapter` class provides backward compatibility with existing fixtures:

```javascript
const { FixtureAdapter } = require('../auth/compatibility/fixture-adapter');

// Create authentication method
const authMethod = FixtureAdapter.createAuthMethod({
  strategy: 'login'
});

// Create test user fixture
const testUser = await FixtureAdapter.createTestUserFixture(authMethod);

// Create authenticated page fixture
const authenticatedPage = await FixtureAdapter.createAuthenticatedPageFixture(
  page, authMethod, testUser.authState
);
```

## Configuration Options

### Common Options

- `baseURL`: Application base URL
- `strategy`: Authentication strategy ('jwt' or 'login')
- `validateWithAPI`: Whether to validate tokens with API
- `retryConfig`: Retry configuration for failed operations

### JWT-Specific Options

- `storageStatePath`: Path to storage state file
- `persistStorageState`: Whether to persist storage state
- `cleanupStorageState`: Whether to cleanup storage state files
- `tokenExpiration`: Token expiration time in seconds

### Login-Specific Options

- `fallbackToLogin`: Whether to fallback to login (always false for login method)

## Method Comparison

| Feature | JWT Method | Login Method |
|---------|------------|--------------|
| Storage State Support | ✅ Yes | ❌ No |
| Performance | ⚡ Fast (reuses state) | 🐌 Slower (manual setup) |
| Playwright Integration | ✅ Native | 🔧 Manual |
| Backward Compatibility | 🔄 Adapter needed | ✅ Direct |
| Test Isolation | ✅ Excellent | ✅ Good |
| Setup Complexity | 🔧 Medium | 🟢 Simple |

## Error Handling

Both methods provide comprehensive error handling:

- `JWTAuthenticationError`: JWT-specific errors
- `LoginAuthenticationError`: Login-specific errors
- `TokenValidationError`: Token validation failures
- `BrowserContextError`: Browser setup failures
- `NetworkAuthenticationError`: Network-related errors

## Best Practices

1. **Use JWT method for performance**: When running many tests, JWT with storage state is faster
2. **Use Login method for compatibility**: When working with existing test suites
3. **Configure cleanup**: Set `CLEANUP_ENABLED=false` to disable cleanup during development
4. **Use environment variables**: Configure strategy via `AUTH_STRATEGY` environment variable
5. **Handle errors gracefully**: Both methods provide detailed error information for debugging

## Migration Guide

To migrate from existing fixtures to the new method pattern:

1. **Replace fixture imports**:
   ```javascript
   // Old
   const { authFixture } = require('../fixtures/auth.fixture');
   
   // New
   const { FixtureAdapter } = require('../auth/compatibility/fixture-adapter');
   ```

2. **Update test setup**:
   ```javascript
   // Old
   authTest('test name', async ({ authenticatedPage, testUser }) => {
     // test code
   });
   
   // New
   test('test name', async ({ page }) => {
     const authMethod = FixtureAdapter.createAuthMethod();
     const testUser = await FixtureAdapter.createTestUserFixture(authMethod);
     const authenticatedPage = await FixtureAdapter.createAuthenticatedPageFixture(
       page, authMethod, testUser.authState
     );
     // test code
     await FixtureAdapter.cleanupAuthResources(authMethod, testUser.authState);
   });
   ```

3. **Configure strategy**:
   ```bash
   # For JWT strategy
   export AUTH_STRATEGY=jwt
   
   # For Login strategy (default)
   export AUTH_STRATEGY=login
   ```