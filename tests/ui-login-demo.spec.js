/**
 * Demo test to showcase UI login process
 * This test is specifically designed to show the email/password entry process
 */

const { expect } = require('@playwright/test');
const { authFixture: test } = require('../fixtures/auth.fixture');

test.describe('UI Login Demo', () => {
  test('should demonstrate visible email and password entry', async ({ authenticatedPage, testUser }) => {
    // The authenticatedPage fixture will have already performed the UI login
    // Let's verify we're authenticated by checking we're on a protected page
    
    console.log('🎉 UI Login completed successfully!');
    console.log(`📧 Test user email: ${testUser.email}`);
    console.log(`👤 Test user username: ${testUser.username}`);
    
    // Verify we're on the diary page (protected page)
    expect(authenticatedPage.url()).toContain('diary.html');
    
    // Verify authentication token exists in localStorage
    const authToken = await authenticatedPage.evaluate(() => {
      return localStorage.getItem('authToken');
    });
    
    expect(authToken).toBeTruthy();
    console.log('✅ Authentication token found in localStorage');
    
    // Take a screenshot to show the authenticated state
    await authenticatedPage.screenshot({ 
      path: 'test-artifacts/screenshots/ui-login-demo-authenticated.png',
      fullPage: true 
    });
    
    console.log('📸 Screenshot saved showing authenticated state');
    
    // Wait a bit so you can see the final state
    await authenticatedPage.waitForTimeout(2000);
  });
});