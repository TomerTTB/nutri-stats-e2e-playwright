# Authentication Methods Guide

This guide explains the two authentication methods available in the NutriStats E2E testing framework and how to use them effectively.

## 🎯 Overview

The testing framework supports two distinct authentication strategies:

1. **UI-Login Method** - Performs actual browser-based login with visible email/password entry
2. **JWT Method** - Uses saved authentication tokens for faster test execution

## 🔧 Configuration

### Environment Variables

The authentication method is controlled by the `AUTH_STRATEGY` environment variable in `.env.test`:

```bash
# For UI-Login Method (default)
AUTH_STRATEGY=ui-login
PERSIST_AUTH_STATE=false
DEBUG_AUTH=true

# For JWT Method
AUTH_STRATEGY=jwt
PERSIST_AUTH_STATE=true
AUTH_STORAGE_PATH=.auth/user.json
JWT_FALLBACK_LOGIN=true
```

## 1️⃣ UI-Login Method

### Description
The UI-Login method performs actual browser-based authentication where you can see the email and password being entered into the login form. This method is ideal for:
- Debugging authentication flows
- Visual verification of login process
- Testing login form functionality
- Demonstrating the authentication process

### How It Works
1. **User Registration**: Creates a test user via API
2. **Browser Navigation**: Opens the login page in the browser
3. **Form Interaction**: Fills in email and password fields visibly
4. **Form Submission**: Clicks the login button and waits for navigation
5. **Verification**: Confirms successful authentication by checking the URL and localStorage

### Configuration
```bash
AUTH_STRATEGY=ui-login
PERSIST_AUTH_STATE=false
DEBUG_AUTH=true
```

### Example Usage
```javascript
const { authFixture: test } = require('../fixtures/auth.fixture');

test('should demonstrate UI login', async ({ authenticatedPage, testUser }) => {
  // The authenticatedPage fixture will have performed visible UI login
  console.log(`Logged in as: ${testUser.email}`);
  
  // Verify we're on the authenticated page
  expect(authenticatedPage.url()).toContain('diary.html');
  
  // Check authentication token in localStorage
  const token = await authenticatedPage.evaluate(() => 
    localStorage.getItem('authToken')
  );
  expect(token).toBeTruthy();
});
```

### Debug Output
When `DEBUG_AUTH=true`, you'll see detailed logging:
```
🔐 Starting UI login process...
📧 Email: testuser@test.com
🔑 Password: [HIDDEN]
✍️ Filled login form, clicking login button...
🌐 After login, current URL: http://localhost:8080/diary.html
✅ UI login successful! Token obtained.
✅ UI login verification successful!
```

## 2️⃣ JWT Method

### Description
The JWT method uses saved authentication tokens to bypass the login form, providing faster test execution. This method is ideal for:
- Fast test execution
- CI/CD pipelines
- Bulk testing scenarios
- Performance testing

### How It Works
1. **Global Setup**: Creates a test user and obtains JWT token during global setup
2. **Storage State**: Saves authentication state to a file (`.auth/user.json`)
3. **Context Reuse**: Reuses the saved authentication state for all tests
4. **Token Management**: Handles token validation and expiration

### Configuration
```bash
AUTH_STRATEGY=jwt
PERSIST_AUTH_STATE=true
AUTH_STORAGE_PATH=.auth/user.json
JWT_FALLBACK_LOGIN=true
```

### Example Usage
```javascript
const { authFixture: test } = require('../fixtures/auth.fixture');

test('should use JWT authentication', async ({ authenticatedPage, testUser, authMethod }) => {
  // Authentication is already set up via storage state
  console.log(`Method: ${authMethod.getType()}`); // "jwt"
  console.log(`Supports Storage State: ${authMethod.supportsStorageState()}`); // true
  
  // Verify we're authenticated
  expect(authenticatedPage.url()).toContain('diary.html');
});
```

### Storage State File
The JWT method creates a storage state file at `.auth/user.json`:
```json
{
  "cookies": [],
  "origins": [
    {
      "origin": "http://localhost:8080",
      "localStorage": [
        { "name": "authToken", "value": "eyJhbGciOiJIUzI1NiIs..." },
        { "name": "user", "value": "{\"id\":\"123\",\"email\":\"test@example.com\"}" }
      ]
    }
  ]
}
```

## 🔄 Switching Between Methods

### Method 1: Environment Variable
Update `.env.test`:
```bash
# Switch to UI-Login
AUTH_STRATEGY=ui-login

# Switch to JWT
AUTH_STRATEGY=jwt
```

### Method 2: Command Line Override
```bash
# Run with UI-Login
AUTH_STRATEGY=ui-login npx playwright test

# Run with JWT
AUTH_STRATEGY=jwt npx playwright test
```

### Method 3: Test-Specific Configuration
```javascript
// Force UI-Login for specific test
process.env.AUTH_STRATEGY = 'ui-login';
const { authFixture: test } = require('../fixtures/auth.fixture');

test('UI-specific test', async ({ authenticatedPage }) => {
  // This test will use UI-Login regardless of global setting
});
```

## 📊 Performance Comparison

| Aspect | UI-Login | JWT |
|--------|----------|-----|
| **Setup Time** | ~3-5 seconds per test | ~1 second (global setup) |
| **Visibility** | Full login process visible | No login UI |
| **Debugging** | Excellent for login issues | Limited login debugging |
| **CI/CD Speed** | Slower | Faster |
| **Token Management** | Per-test | Global/reused |
| **Storage State** | Not used | Used |

## 🧪 Testing Both Methods

Use the provided test script to verify both methods work:

```bash
node test-both-auth-methods.js
```

This script will:
1. Test UI-Login method with visible authentication
2. Switch configuration to JWT method
3. Test JWT method with token-based authentication
4. Restore original configuration
5. Provide a summary of results

## 🔍 Troubleshooting

### UI-Login Method Issues

**Problem**: Login form not found
```
Error: Locator('#login-email') not found
```
**Solution**: Verify the application is running and login page is accessible

**Problem**: Authentication fails after form submission
```
Error: Still on login page after form submission
```
**Solution**: Check credentials, API connectivity, and form selectors

### JWT Method Issues

**Problem**: Storage state file not created
```
Error: Failed to save storage state
```
**Solution**: Check file permissions and directory structure

**Problem**: Token validation fails
```
Error: JWT token has expired
```
**Solution**: Increase `TOKEN_EXPIRATION` or regenerate tokens

### General Issues

**Problem**: Tests fail with "redirected to login"
```
Error: expect(received).not.toContain("login.html")
```
**Solution**: 
1. Check if application is running
2. Verify authentication method configuration
3. Check API connectivity
4. Review debug logs

## 🎯 Best Practices

### When to Use UI-Login
- ✅ Debugging authentication flows
- ✅ Testing login form functionality
- ✅ Visual verification needed
- ✅ Development and manual testing
- ✅ Login-specific test scenarios

### When to Use JWT
- ✅ CI/CD pipelines
- ✅ Performance testing
- ✅ Bulk test execution
- ✅ Non-login functionality testing
- ✅ Regression testing

### Configuration Tips
1. **Development**: Use UI-Login with `DEBUG_AUTH=true`
2. **CI/CD**: Use JWT with `PERSIST_AUTH_STATE=true`
3. **Mixed Testing**: Switch methods based on test requirements
4. **Debugging**: Enable debug logging for troubleshooting

## 📝 Example Test Files

### UI-Login Test Example
```javascript
// tests/auth/ui-login-example.spec.js
const { authFixture: test } = require('../../fixtures/auth.fixture');

test.describe('UI Login Examples', () => {
  test('should show login process', async ({ authenticatedPage, testUser }) => {
    // Login process was visible during setup
    console.log(`✅ Logged in as: ${testUser.email}`);
    
    // Verify authentication
    expect(authenticatedPage.url()).toContain('diary.html');
    
    // Take screenshot of authenticated state
    await authenticatedPage.screenshot({ 
      path: 'test-artifacts/screenshots/ui-login-success.png' 
    });
  });
});
```

### JWT Test Example
```javascript
// tests/auth/jwt-example.spec.js
const { authFixture: test } = require('../../fixtures/auth.fixture');

test.describe('JWT Examples', () => {
  test('should use saved token', async ({ authenticatedPage, authMethod }) => {
    // Authentication via storage state
    console.log(`✅ Method: ${authMethod.getType()}`);
    console.log(`✅ Storage State: ${authMethod.supportsStorageState()}`);
    
    // Verify authentication
    expect(authenticatedPage.url()).toContain('diary.html');
    
    // Check token in localStorage
    const token = await authenticatedPage.evaluate(() => 
      localStorage.getItem('authToken')
    );
    expect(token).toBeTruthy();
  });
});
```

## 🚀 Quick Start Commands

```bash
# Test UI-Login method
AUTH_STRATEGY=ui-login npx playwright test tests/ui-login-demo.spec.js

# Test JWT method  
AUTH_STRATEGY=jwt npx playwright test tests/auth-method-verification.spec.js

# Run all auth tests with UI-Login
AUTH_STRATEGY=ui-login npx playwright test tests/auth/

# Run all auth tests with JWT
AUTH_STRATEGY=jwt npx playwright test tests/auth/

# Test both methods
node test-both-auth-methods.js
```

## ✅ Verification Checklist

- [ ] UI-Login method shows visible email/password entry
- [ ] JWT method uses saved authentication tokens
- [ ] Both methods successfully authenticate users
- [ ] Tests pass with both authentication strategies
- [ ] Debug logging works correctly
- [ ] Storage state files are created/used appropriately
- [ ] Authentication persists across page navigation
- [ ] Cleanup works for both methods

---

**🎉 Both authentication methods are now fully functional and ready for use in your E2E testing workflow!**