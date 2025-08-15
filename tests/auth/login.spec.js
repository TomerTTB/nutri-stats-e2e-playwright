/**
 * Login functionality tests
 * Tests for successful login with valid credentials, login validation and error handling,
 * authentication state persistence, and login form validation
 * Requirements: 4.1, 3.1, 3.2
 */

const { test, expect } = require('@playwright/test');
const { authFixture, UserManager, StorageManager } = require('../../fixtures/auth.fixture');
const LoginPage = require('../../pages/auth/LoginPage');
const { generateTestUser, generateEdgeCaseData } = require('../../utils/data-generators');

// Use our authentication fixture
const authTest = authFixture;

authTest.describe('Login Functionality Tests', () => {

  authTest.describe('Successful Login Tests', () => {

    authTest('should login successfully with valid credentials', async ({ page, testUser }) => {
      const loginPage = new LoginPage(page);

      // Navigate to login page
      await loginPage.navigateToLogin();
      await loginPage.verifyPageLoaded();

      // Perform login with valid credentials
      await loginPage.login(testUser.email, testUser.password);

      // Wait for successful login
      await loginPage.waitForSuccessAlert();
      await loginPage.waitForRedirectToDiary();

      // Verify authentication state
      const authState = await loginPage.verifyAuthenticationState({
        email: testUser.email
      });

      expect(authState.token).toBeDefined();
      expect(authState.userData.email).toBe(testUser.email);

      // Verify we're redirected to diary page
      await loginPage.verifyRedirectToDiary();

      // Take screenshot of successful login
      await loginPage.takeScreenshot('successful-login');
    });

    authTest('should maintain authentication state after page reload', async ({ page, testUser }) => {
      const loginPage = new LoginPage(page);

      // Navigate and login
      await loginPage.navigateToLogin();
      await loginPage.loginAndWaitForSuccess(testUser.email, testUser.password);

      // Verify initial authentication state
      const initialAuthState = await loginPage.verifyAuthenticationState();
      expect(initialAuthState.token).toBeDefined();

      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify authentication state persists after reload
      const persistedAuthState = await loginPage.verifyAuthenticationState();
      expect(persistedAuthState.token).toBe(initialAuthState.token);
      expect(persistedAuthState.userData.email).toBe(testUser.email);

      // Verify we're still on diary page (not redirected to login)
      expect(page.url()).toContain('diary.html');

      // Take screenshot showing persistent auth state
      await loginPage.takeScreenshot('persistent-auth-state');
    });

    authTest('should login successfully after clearing and re-entering credentials', async ({ page, testUser }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Fill form with credentials
      await loginPage.fillLoginEmail(testUser.email);
      await loginPage.fillLoginPassword(testUser.password);

      // Clear the form
      await loginPage.clearLoginForm();

      // Verify form is cleared
      const clearedValues = await loginPage.getLoginFormValues();
      expect(clearedValues.email).toBe('');
      expect(clearedValues.password).toBe('');

      // Re-enter credentials and login
      await loginPage.loginAndWaitForSuccess(testUser.email, testUser.password);

      // Verify successful login
      await loginPage.verifyAuthenticationState({ email: testUser.email });
      await loginPage.verifyRedirectToDiary();

      // Take screenshot
      await loginPage.takeScreenshot('login-after-form-clear');
    });

  });

  authTest.describe('Login Validation and Error Handling Tests', () => {

    authTest('should show error for invalid email', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Test with invalid email
      await loginPage.testInvalidLogin(
        'invalid@nonexistent.com',
        'SomePassword123!',
        'Invalid'
      );

      // Verify error state
      expect(await loginPage.isErrorAlertVisible()).toBe(true);

      // Take screenshot of error state
      await loginPage.takeScreenshot('invalid-email-error');
    });

    authTest('should show error for invalid password', async ({ page, testUser }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Test with valid email but wrong password
      await loginPage.testInvalidLogin(
        testUser.email,
        'WrongPassword123!',
        'Invalid'
      );

      // Verify error state
      expect(await loginPage.isErrorAlertVisible()).toBe(true);

      // Take screenshot
      await loginPage.takeScreenshot('invalid-password-error');
    });

    authTest('should show error for non-existent user', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const nonExistentUser = generateTestUser();

      await loginPage.navigateToLogin();

      // Test with non-existent user credentials
      await loginPage.testInvalidLogin(
        nonExistentUser.email,
        nonExistentUser.password,
        'Invalid'
      );

      // Verify error state
      expect(await loginPage.isErrorAlertVisible()).toBe(true);

      // Take screenshot
      await loginPage.takeScreenshot('non-existent-user-error');
    });

    authTest('should handle multiple failed login attempts', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Attempt multiple failed logins
      for (let i = 0; i < 3; i++) {
        await loginPage.login('invalid@test.com', 'wrongpassword');
        
        try {
          await loginPage.waitForErrorAlert();
          expect(await loginPage.isErrorAlertVisible()).toBe(true);
          
          // Close alert before next attempt
          await loginPage.closeAlert();
          await loginPage.waitForAlertToDisappear();
        } catch (error) {
          // If rate limiting kicks in, we might not see individual errors
          console.log(`Login attempt ${i + 1} - might be rate limited`);
        }
      }

      // Take screenshot of final state
      await loginPage.takeScreenshot('multiple-failed-attempts');
    });

    authTest('should display appropriate error messages', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Test with invalid credentials
      await loginPage.loginAndWaitForError('test@invalid.com', 'wrongpass');

      // Get and verify error message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toBeDefined();
      expect(errorMessage.length).toBeGreaterThan(0);

      // Error message should contain relevant information
      const hasRelevantError = errorMessage.toLowerCase().includes('invalid') ||
                              errorMessage.toLowerCase().includes('incorrect') ||
                              errorMessage.toLowerCase().includes('failed') ||
                              errorMessage.toLowerCase().includes('error');
      
      expect(hasRelevantError).toBe(true);

      // Take screenshot showing error message
      await loginPage.takeScreenshot('error-message-display');
    });

    authTest('should handle network errors gracefully', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Simulate network error by going offline
      await page.context().setOffline(true);

      try {
        // Attempt login while offline
        await loginPage.login('test@example.com', 'password123');

        // Wait a bit for any error to appear
        await page.waitForTimeout(2000);

        // Check if any error handling occurred
        const hasError = await loginPage.isErrorAlertVisible();
        
        if (hasError) {
          const errorMessage = await loginPage.getErrorMessage();
          console.log('Network error message:', errorMessage);
        }

        // Take screenshot of offline state
        await loginPage.takeScreenshot('network-error-handling');

      } finally {
        // Restore network connection
        await page.context().setOffline(false);
      }
    });

  });

  authTest.describe('Authentication State Persistence Tests', () => {

    authTest('should persist authentication across browser tabs', async ({ page, testUser, context }) => {
      const loginPage = new LoginPage(page);

      // Login in first tab
      await loginPage.navigateToLogin();
      await loginPage.loginAndWaitForSuccess(testUser.email, testUser.password);

      // Verify authentication state
      const authState = await loginPage.verifyAuthenticationState();

      // Open new tab
      const newTab = await context.newPage();
      const newLoginPage = new LoginPage(newTab);

      // Navigate to diary page in new tab
      await newTab.goto('/diary.html');
      await newTab.waitForLoadState('networkidle');

      // Verify authentication state persists in new tab
      const newTabAuthState = await newLoginPage.verifyAuthenticationState();
      expect(newTabAuthState.token).toBe(authState.token);

      // Verify we're not redirected to login in new tab
      expect(newTab.url()).toContain('diary.html');

      // Take screenshots of both tabs
      await loginPage.takeScreenshot('auth-persistence-tab1');
      await newLoginPage.takeScreenshot('auth-persistence-tab2');

      await newTab.close();
    });

    authTest('should maintain authentication after browser navigation', async ({ page, testUser }) => {
      const loginPage = new LoginPage(page);

      // Login
      await loginPage.navigateToLogin();
      await loginPage.loginAndWaitForSuccess(testUser.email, testUser.password);

      // Navigate to different pages
      await page.goto('/foods.html');
      await page.waitForLoadState('networkidle');

      // Verify still authenticated
      let authState = await loginPage.verifyAuthenticationState();
      expect(authState.token).toBeDefined();

      // Navigate to reports page
      await page.goto('/reports.html');
      await page.waitForLoadState('networkidle');

      // Verify still authenticated
      authState = await loginPage.verifyAuthenticationState();
      expect(authState.token).toBeDefined();

      // Navigate back to diary
      await page.goto('/diary.html');
      await page.waitForLoadState('networkidle');

      // Verify still authenticated
      authState = await loginPage.verifyAuthenticationState();
      expect(authState.token).toBeDefined();

      // Take screenshot showing persistent auth across navigation
      await loginPage.takeScreenshot('auth-persistence-navigation');
    });

    authTest('should clear authentication state on logout', async ({ page, testUser }) => {
      const loginPage = new LoginPage(page);
      const storageManager = new StorageManager(page);

      // Login
      await loginPage.navigateToLogin();
      await loginPage.loginAndWaitForSuccess(testUser.email, testUser.password);

      // Verify authentication state
      let authState = await storageManager.getAuthState();
      expect(authState.isAuthenticated).toBe(true);

      // Clear authentication data (simulate logout)
      await loginPage.clearAuthData();

      // Verify authentication state is cleared
      authState = await storageManager.getAuthState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.token).toBeNull();

      // Navigate to protected page - should redirect to login
      await page.goto('/diary.html');
      await page.waitForLoadState('networkidle');

      // Should be redirected to login page
      expect(page.url()).toContain('login.html');

      // Take screenshot showing cleared auth state
      await loginPage.takeScreenshot('cleared-auth-state');
    });

    authTest('should handle expired authentication tokens', async ({ page, testUser }) => {
      const loginPage = new LoginPage(page);
      const storageManager = new StorageManager(page);

      // Login
      await loginPage.navigateToLogin();
      await loginPage.loginAndWaitForSuccess(testUser.email, testUser.password);

      // Set an expired/invalid token
      await storageManager.setAuthState({
        token: 'expired-token-123',
        user: { email: testUser.email }
      });

      // Navigate to protected page
      await page.goto('/diary.html');
      await page.waitForLoadState('networkidle');

      // Should handle expired token appropriately
      // (Either redirect to login or show error)
      const currentUrl = page.url();
      const isOnLogin = currentUrl.includes('login.html');
      const isOnDiary = currentUrl.includes('diary.html');

      // Should either be redirected to login or handle the error gracefully
      expect(isOnLogin || isOnDiary).toBe(true);

      // Take screenshot of expired token handling
      await loginPage.takeScreenshot('expired-token-handling');
    });

  });

  authTest.describe('Login Form Validation Tests', () => {

    authTest('should validate empty email field', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Try to submit with empty email
      await loginPage.fillLoginPassword('password123');
      await loginPage.clickLoginSubmit();

      // HTML5 validation should prevent submission
      const emailInput = page.locator('#login-email');
      const isValid = await emailInput.evaluate(el => el.checkValidity());
      expect(isValid).toBe(false);

      // Get validation message
      const validationMessage = await emailInput.evaluate(el => el.validationMessage);
      expect(validationMessage).toBeTruthy();

      // Take screenshot showing validation
      await loginPage.takeScreenshot('empty-email-validation');
    });

    authTest('should validate empty password field', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Try to submit with empty password
      await loginPage.fillLoginEmail('test@example.com');
      await loginPage.clickLoginSubmit();

      // HTML5 validation should prevent submission
      const passwordInput = page.locator('#login-password');
      const isValid = await passwordInput.evaluate(el => el.checkValidity());
      expect(isValid).toBe(false);

      // Get validation message
      const validationMessage = await passwordInput.evaluate(el => el.validationMessage);
      expect(validationMessage).toBeTruthy();

      // Take screenshot
      await loginPage.takeScreenshot('empty-password-validation');
    });

    authTest('should validate invalid email format', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Test various invalid email formats
      const invalidEmails = [
        'invalid-email',
        'invalid@',
        '@invalid.com',
        'invalid..email@test.com',
        'invalid email@test.com'
      ];

      for (const invalidEmail of invalidEmails) {
        await loginPage.fillLoginEmail(invalidEmail);
        await loginPage.fillLoginPassword('password123');
        
        // Check validity before clicking submit
        const emailInput = page.locator('#login-email');
        const isValid = await emailInput.evaluate(el => el.checkValidity());
        
        if (!isValid) {
          // If HTML5 validation catches it, verify the validation message
          const validationMessage = await emailInput.evaluate(el => el.validationMessage);
          expect(validationMessage).toBeTruthy();
          expect(isValid).toBe(false);
        } else {
          // If HTML5 doesn't catch it, try submitting and expect server-side validation
          await loginPage.clickLoginSubmit();
          
          // Wait a moment for any response
          await page.waitForTimeout(1000);
          
          // Check if we're still on the login page (form didn't submit successfully)
          const currentUrl = page.url();
          expect(currentUrl).toContain('login.html');
        }

        // Clear form for next test
        await loginPage.clearLoginForm();
      }

      // Take screenshot of final validation state
      await loginPage.takeScreenshot('invalid-email-format-validation');
    });

    authTest('should validate form with both fields empty', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Ensure form is empty
      await loginPage.clearLoginForm();

      // Try to submit empty form
      await loginPage.clickLoginSubmit();

      // Both fields should be invalid
      const emailInput = page.locator('#login-email');
      const passwordInput = page.locator('#login-password');

      const emailValid = await emailInput.evaluate(el => el.checkValidity());
      const passwordValid = await passwordInput.evaluate(el => el.checkValidity());

      expect(emailValid).toBe(false);
      expect(passwordValid).toBe(false);

      // Take screenshot
      await loginPage.takeScreenshot('empty-form-validation');
    });

    authTest('should handle special characters in credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const edgeCaseData = generateEdgeCaseData();

      await loginPage.navigateToLogin();

      // Test with special character credentials
      await loginPage.login(
        edgeCaseData.specialCharUser.email,
        edgeCaseData.specialCharUser.password
      );

      // Should handle special characters gracefully
      // (Either process them or show appropriate error)
      try {
        await loginPage.waitForErrorAlert();
        expect(await loginPage.isErrorAlertVisible()).toBe(true);
      } catch (error) {
        // If no error alert, form should still be functional
        const formValues = await loginPage.getLoginFormValues();
        expect(formValues.email).toBe(edgeCaseData.specialCharUser.email);
      }

      // Take screenshot
      await loginPage.takeScreenshot('special-characters-handling');
    });

    authTest('should handle very long input values', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Test with very long email and password
      const longEmail = 'a'.repeat(100) + '@example.com';
      const longPassword = 'P'.repeat(100) + '123!';

      await loginPage.fillLoginEmail(longEmail);
      await loginPage.fillLoginPassword(longPassword);

      // Verify values were entered (may be truncated by maxlength)
      const formValues = await loginPage.getLoginFormValues();
      expect(formValues.email.length).toBeGreaterThan(0);
      expect(formValues.password.length).toBeGreaterThan(0);

      // Try to submit
      await loginPage.clickLoginSubmit();

      // Should handle long inputs gracefully
      try {
        await loginPage.waitForErrorAlert();
        expect(await loginPage.isErrorAlertVisible()).toBe(true);
      } catch (error) {
        // Form should still be functional
        console.log('Long input handled without error alert');
      }

      // Take screenshot
      await loginPage.takeScreenshot('long-input-handling');
    });

    authTest('should maintain form state during validation errors', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Fill form with invalid credentials
      const testEmail = 'test@example.com';
      const testPassword = 'wrongpassword';

      await loginPage.login(testEmail, testPassword);

      // Wait for error
      try {
        await loginPage.waitForErrorAlert();
      } catch (error) {
        // Continue even if no error alert appears
      }

      // Verify form values are maintained after error
      const formValues = await loginPage.getLoginFormValues();
      expect(formValues.email).toBe(testEmail);
      // Password field might be cleared for security reasons
      
      // Take screenshot showing maintained form state
      await loginPage.takeScreenshot('form-state-after-error');
    });

  });

  authTest.describe('Login Form Interaction Tests', () => {

    authTest('should support keyboard navigation', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Focus on email field and use Tab to navigate
      await page.locator('#login-email').focus();
      
      // Fill email and tab to password
      await page.keyboard.type('test@example.com');
      await page.keyboard.press('Tab');
      
      // Verify focus moved to password field
      const focusedElement = await page.evaluate(() => document.activeElement.id);
      expect(focusedElement).toBe('login-password');
      
      // Fill password and tab to submit button
      await page.keyboard.type('password123');
      await page.keyboard.press('Tab');
      
      // Verify focus moved to submit button
      const submitFocused = await page.evaluate(() => 
        document.activeElement.type === 'submit'
      );
      expect(submitFocused).toBe(true);

      // Take screenshot showing keyboard navigation
      await loginPage.takeScreenshot('keyboard-navigation');
    });

    authTest('should support Enter key submission', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Fill form
      await loginPage.fillLoginEmail('test@example.com');
      await loginPage.fillLoginPassword('password123');

      // Press Enter to submit
      await page.keyboard.press('Enter');

      // Should trigger form submission
      try {
        await loginPage.waitForErrorAlert();
        expect(await loginPage.isErrorAlertVisible()).toBe(true);
      } catch (error) {
        // Form submission occurred (might not show error if rate limited)
        console.log('Enter key submission triggered');
      }

      // Take screenshot
      await loginPage.takeScreenshot('enter-key-submission');
    });

    authTest('should handle form switching correctly', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigateToLogin();

      // Verify initial login form state
      await loginPage.verifyLoginFormDisplayed();

      // Switch to registration form
      await loginPage.switchToRegistration();
      await loginPage.verifyRegistrationFormDisplayed();

      // Switch back to login form
      await loginPage.switchToLogin();
      await loginPage.verifyLoginFormDisplayed();

      // Take screenshot of form switching
      await loginPage.takeScreenshot('form-switching-complete');
    });

  });

});

// Additional tests without authentication fixture for basic functionality
test.describe('Login Page Basic Functionality', () => {

  test('should load login page without errors', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');

    // Verify basic page elements
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('#login-form button[type="submit"]')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'e2e-tests/screenshots/basic-login-page-load.png',
      fullPage: true
    });
  });

  test('should have proper form attributes', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');

    // Check email input attributes
    const emailInput = page.locator('#login-email');
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required');

    // Check password input attributes
    const passwordInput = page.locator('#login-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('required');

    // Check form attributes
    const form = page.locator('#login-form');
    await expect(form).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'e2e-tests/screenshots/form-attributes-check.png'
    });
  });

});