# Token Storage Guide

## 🗂️ Where Authentication Tokens Are Stored

### 1. **JWT Method** (`AUTH_STRATEGY=jwt`)
**File System Storage:**
- **Location**: `.auth/user.json` (configurable via `AUTH_STORAGE_PATH`)
- **Format**: Playwright storage state file
- **Contains**: 
  - Authentication token
  - User data
  - Browser localStorage/sessionStorage state
  - Cookies

**Example file content:**
```json
{
  "cookies": [],
  "origins": [
    {
      "origin": "http://localhost:8080",
      "localStorage": [
        { "name": "authToken", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
        { "name": "user", "value": "{\"id\":\"123\",\"email\":\"test@example.com\"}" }
      ]
    }
  ]
}
```

### 2. **Login Method** (`AUTH_STRATEGY=login`)
**No File System Storage:**
- **Location**: Only in browser's localStorage during test execution
- **Persistence**: Temporary - only exists during test run
- **Format**: Set directly in browser localStorage via JavaScript

**Browser localStorage:**
```javascript
localStorage.setItem('authToken', 'your-jwt-token-here');
localStorage.setItem('user', '{"id":"123","email":"test@example.com"}');
```

### 3. **UI-Login Method** (`AUTH_STRATEGY=ui-login`)
**No File System Storage:**
- **Location**: Only in browser's localStorage during test execution
- **Persistence**: Temporary - only exists during test run
- **Source**: Token obtained from browser after UI form submission
- **Format**: Retrieved from localStorage after successful login

**Browser localStorage (same as login method):**
```javascript
localStorage.setItem('authToken', 'token-from-ui-login');
localStorage.setItem('user', '{"id":"123","email":"test@example.com"}');
```

## 📁 **File System Locations**

### Current Configuration:
```bash
# JWT Storage Path (when AUTH_STRATEGY=jwt)
AUTH_STORAGE_PATH=.auth/user.json

# Actual file locations:
e2e-tests/.auth/user.json          # JWT storage state
e2e-tests/.auth/user-data.json     # JWT user data for cleanup
```

### Directory Structure:
```
e2e-tests/
├── .auth/                         # JWT authentication files
│   ├── user.json                  # Playwright storage state
│   └── user-data.json            # User data for cleanup
├── .env.test                      # Environment configuration
└── tests/                         # Test files
```

## 🔍 **How to Check Token Storage**

### For JWT Method:
```bash
# Check if storage state file exists
ls -la e2e-tests/.auth/

# View storage state content
cat e2e-tests/.auth/user.json
```

### For Login/UI-Login Methods:
```javascript
// In browser console during test
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', localStorage.getItem('user'));
```

## ⚙️ **Configuration Options**

### JWT Storage Configuration:
```bash
# In .env.test file
AUTH_STRATEGY=jwt
PERSIST_AUTH_STATE=true           # Enable file storage
AUTH_STORAGE_PATH=.auth/user.json # Storage file path
```

### Login/UI-Login Configuration:
```bash
# In .env.test file
AUTH_STRATEGY=ui-login            # or 'login'
PERSIST_AUTH_STATE=false          # No file storage needed
```

## 🧹 **Cleanup Behavior**

### JWT Method:
- Storage state file is cleaned up after tests (if `cleanupStorageState=true`)
- User data file is removed during cleanup

### Login/UI-Login Methods:
- No files to clean up
- Browser localStorage is cleared when browser closes
- User data is cleaned up via API calls

## 🔐 **Security Notes**

1. **JWT storage files contain sensitive tokens** - they should be in `.gitignore`
2. **Tokens are temporary** - they expire and are regenerated for each test run
3. **Local storage tokens** are only accessible within the browser context
4. **Cleanup is automatic** - tokens are removed after test completion

## 📋 **Current Status**

Based on your current configuration (`AUTH_STRATEGY=ui-login`):
- ✅ **No file system storage** - tokens only exist in browser localStorage
- ✅ **Temporary tokens** - created and destroyed with each test
- ✅ **UI-based authentication** - tokens obtained through visible login process
- ✅ **Automatic cleanup** - no persistent files to manage