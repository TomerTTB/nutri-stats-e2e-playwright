/**
 * Test to verify which authentication method is being used
 */

const { expect } = require('@playwright/test');
const { authFixture: test } = require('../fixtures/auth.fixture');

test.describe('Authentication Method Verification', () => {
  test('should verify ui-login method is being used', async ({ authMethod, testUser, authenticatedPage }) => {
    // Check the authentication method type
    console.log('🔍 Authentication Method Verification');
    console.log('====================================');
    console.log(`📋 Method Type: ${authMethod.getType()}`);
    console.log(`💾 Supports Storage State: ${authMethod.supportsStorageState()}`);
    console.log(`📧 Test User Email: ${testUser.email}`);
    console.log(`👤 Test User Username: ${testUser.username}`);
    
    // Verify it's the ui-login method
    expect(authMethod.getType()).toBe('ui-login');
    expect(authMethod.supportsStorageState()).toBe(false);
    
    // Check environment variables
    console.log(`🌍 AUTH_STRATEGY env var: ${process.env.AUTH_STRATEGY || 'not set'}`);
    console.log(`🐛 DEBUG_AUTH env var: ${process.env.DEBUG_AUTH || 'not set'}`);
    
    // Verify we're on an authenticated page
    expect(authenticatedPage.url()).toContain('diary.html');
    console.log(`🌐 Current URL: ${authenticatedPage.url()}`);
    
    // Check localStorage for authentication token
    const authData = await authenticatedPage.evaluate(() => {
      return {
        token: localStorage.getItem('authToken'),
        user: localStorage.getItem('user'),
        tokenExists: !!localStorage.getItem('authToken'),
        userExists: !!localStorage.getItem('user')
      };
    });
    
    console.log(`🔐 Token exists in localStorage: ${authData.tokenExists}`);
    console.log(`👤 User data exists in localStorage: ${authData.userExists}`);
    
    if (authData.token) {
      console.log(`🎫 Token preview: ${authData.token.substring(0, 20)}...`);
    }
    
    if (authData.user) {
      const userData = JSON.parse(authData.user);
      console.log(`📧 User email from localStorage: ${userData.email || 'not found'}`);
    }
    
    // Verify authentication is working
    expect(authData.tokenExists).toBe(true);
    expect(authData.userExists).toBe(true);
    
    // Check if any storage state files exist (should not for ui-login)
    const storageStateExists = await authenticatedPage.evaluate(async () => {
      try {
        const response = await fetch('/.auth/user.json');
        return response.ok;
      } catch {
        return false;
      }
    });
    
    console.log(`📁 Storage state file exists: ${storageStateExists}`);
    expect(storageStateExists).toBe(false); // Should not exist for ui-login
    
    // Take a screenshot showing the authenticated state
    await authenticatedPage.screenshot({ 
      path: 'test-artifacts/screenshots/ui-login-verification.png',
      fullPage: true 
    });
    
    console.log('📸 Screenshot saved: ui-login-verification.png');
    console.log('✅ UI-Login method verification complete!');
    
    // Wait a moment so you can see the browser state
    await authenticatedPage.waitForTimeout(2000);
  });
});