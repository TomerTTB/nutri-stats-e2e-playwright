/**
 * LoginPage class extending BasePage
 * Handles login form interactions, authentication state verification,
 * and error message validation methods
 */

const BasePage = require('../base/BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Page selectors
    this.selectors = {
      // Form containers
      loginForm: '#login-form',
      registerForm: '#register-form',
      alertContainer: '#alert-container',
      
      // Login form elements
      loginEmailInput: '#login-email',
      loginPasswordInput: '#login-password',
      loginSubmitButton: '#login-form button[type="submit"]',
      
      // Registration form elements
      registerNameInput: '#register-name',
      registerEmailInput: '#register-email',
      registerPasswordInput: '#register-password',
      registerConfirmPasswordInput: '#register-confirm-password',
      registerSubmitButton: '#register-form button[type="submit"]',
      
      // Form switching
      formTitle: '#form-title',
      switchLink: '#switch-link',
      switchText: '#switch-text',
      
      // Alert elements
      alertMessage: '.alert',
      alertDanger: '.alert-danger',
      alertSuccess: '.alert-success',
      alertCloseButton: '.btn-close',
      
      // Page elements
      loginCard: '.login-card',
      loginHeader: '.login-header',
      loginBody: '.login-body'
    };
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin() {
    await this.navigate('/login.html');
    await this.waitForPageLoad();
    await this.waitForElement(this.selectors.loginForm);
  }

  /**
   * Check if currently on login page
   */
  async isOnLoginPage() {
    const currentUrl = this.getCurrentUrl();
    return currentUrl.includes('login.html');
  }

  /**
   * Wait for login form to be visible
   */
  async waitForLoginForm() {
    await this.waitForElement(this.selectors.loginForm);
    await this.assertElementVisible(this.selectors.loginEmailInput);
    await this.assertElementVisible(this.selectors.loginPasswordInput);
    await this.assertElementVisible(this.selectors.loginSubmitButton);
  }

  /**
   * Wait for registration form to be visible
   */
  async waitForRegistrationForm() {
    await this.waitForElement(this.selectors.registerForm);
    await this.assertElementVisible(this.selectors.registerNameInput);
    await this.assertElementVisible(this.selectors.registerEmailInput);
    await this.assertElementVisible(this.selectors.registerPasswordInput);
    await this.assertElementVisible(this.selectors.registerSubmitButton);
  }

  // Login form interaction methods

  /**
   * Fill login email field
   * @param {string} email - Email address
   */
  async fillLoginEmail(email) {
    await this.waitForElement(this.selectors.loginEmailInput);
    await this.clearAndFill(this.selectors.loginEmailInput, email);
  }

  /**
   * Fill login password field
   * @param {string} password - Password
   */
  async fillLoginPassword(password) {
    await this.waitForElement(this.selectors.loginPasswordInput);
    await this.clearAndFill(this.selectors.loginPasswordInput, password);
  }

  /**
   * Click login submit button
   */
  async clickLoginSubmit() {
    await this.waitForElement(this.selectors.loginSubmitButton);
    await this.clickElement(this.selectors.loginSubmitButton);
  }

  /**
   * Perform complete login flow
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async login(email, password) {
    await this.waitForLoginForm();
    await this.fillLoginEmail(email);
    await this.fillLoginPassword(password);
    await this.clickLoginSubmit();
  }

  /**
   * Perform login and wait for success
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async loginAndWaitForSuccess(email, password) {
    await this.login(email, password);
    await this.waitForSuccessAlert();
    await this.waitForRedirectToDiary();
  }

  /**
   * Perform login and wait for error
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async loginAndWaitForError(email, password) {
    await this.login(email, password);
    await this.waitForErrorAlert();
  }

  // Registration form interaction methods

  /**
   * Switch to registration form
   */
  async switchToRegistration() {
    await this.waitForElement(this.selectors.switchLink);
    await this.clickElement(this.selectors.switchLink);
    await this.waitForRegistrationForm();
    await this.assertElementText(this.selectors.formTitle, 'Register');
  }

  /**
   * Switch to login form
   */
  async switchToLogin() {
    await this.waitForElement(this.selectors.switchLink);
    await this.clickElement(this.selectors.switchLink);
    await this.waitForLoginForm();
    await this.assertElementText(this.selectors.formTitle, 'Login');
  }

  /**
   * Fill registration name field
   * @param {string} name - Full name
   */
  async fillRegistrationName(name) {
    await this.waitForElement(this.selectors.registerNameInput);
    await this.clearAndFill(this.selectors.registerNameInput, name);
  }

  /**
   * Fill registration email field
   * @param {string} email - Email address
   */
  async fillRegistrationEmail(email) {
    await this.waitForElement(this.selectors.registerEmailInput);
    await this.clearAndFill(this.selectors.registerEmailInput, email);
  }

  /**
   * Fill registration password field
   * @param {string} password - Password
   */
  async fillRegistrationPassword(password) {
    await this.waitForElement(this.selectors.registerPasswordInput);
    await this.clearAndFill(this.selectors.registerPasswordInput, password);
  }

  /**
   * Fill registration confirm password field
   * @param {string} password - Confirm password
   */
  async fillRegistrationConfirmPassword(password) {
    await this.waitForElement(this.selectors.registerConfirmPasswordInput);
    await this.clearAndFill(this.selectors.registerConfirmPasswordInput, password);
  }

  /**
   * Click registration submit button
   */
  async clickRegistrationSubmit() {
    await this.waitForElement(this.selectors.registerSubmitButton);
    await this.clickElement(this.selectors.registerSubmitButton);
  }

  /**
   * Perform complete registration flow
   * @param {Object} userData - User registration data
   */
  async register(userData) {
    await this.switchToRegistration();
    await this.fillRegistrationName(userData.name || userData.fullName);
    await this.fillRegistrationEmail(userData.email);
    await this.fillRegistrationPassword(userData.password);
    await this.fillRegistrationConfirmPassword(userData.confirmPassword || userData.password);
    await this.clickRegistrationSubmit();
  }

  /**
   * Perform registration and wait for success
   * @param {Object} userData - User registration data
   */
  async registerAndWaitForSuccess(userData) {
    await this.register(userData);
    await this.waitForSuccessAlert();
    await this.waitForRedirectToDiary();
  }

  /**
   * Perform registration and wait for error
   * @param {Object} userData - User registration data
   */
  async registerAndWaitForError(userData) {
    await this.register(userData);
    await this.waitForErrorAlert();
  }

  // Authentication state verification methods

  /**
   * Check if user is authenticated by checking localStorage
   */
  async isUserAuthenticated() {
    return await this.page.evaluate(() => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      return !!(token && user);
    });
  }

  /**
   * Get authentication token from localStorage
   */
  async getAuthToken() {
    return await this.page.evaluate(() => {
      return localStorage.getItem('authToken');
    });
  }

  /**
   * Get user data from localStorage
   */
  async getUserData() {
    return await this.page.evaluate(() => {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    });
  }

  /**
   * Clear authentication data from localStorage
   */
  async clearAuthData() {
    await this.page.evaluate(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    });
  }

  /**
   * Set authentication data in localStorage
   * @param {string} token - Auth token
   * @param {Object} user - User data
   */
  async setAuthData(token, user) {
    await this.page.evaluate((authData) => {
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, { token, user });
  }

  /**
   * Wait for redirect to diary page after successful authentication
   */
  async waitForRedirectToDiary() {
    await this.waitForURL(/diary\.html/);
    await this.waitForPageLoad();
  }

  /**
   * Verify user is redirected to diary page
   */
  async verifyRedirectToDiary() {
    const currentUrl = this.getCurrentUrl();
    if (!currentUrl.includes('diary.html')) {
      throw new Error(`Expected to be redirected to diary.html but current URL is: ${currentUrl}`);
    }
  }

  /**
   * Verify authentication state after login
   * @param {Object} expectedUser - Expected user data (optional)
   */
  async verifyAuthenticationState(expectedUser = null) {
    const isAuthenticated = await this.isUserAuthenticated();
    if (!isAuthenticated) {
      throw new Error('User should be authenticated but authentication state is false');
    }

    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Auth token should be present but is null or empty');
    }

    const userData = await this.getUserData();
    if (!userData) {
      throw new Error('User data should be present but is null');
    }

    if (expectedUser) {
      if (expectedUser.email && userData.email !== expectedUser.email) {
        throw new Error(`Expected user email ${expectedUser.email} but got ${userData.email}`);
      }
      
      if (expectedUser.name && userData.name !== expectedUser.name) {
        throw new Error(`Expected user name ${expectedUser.name} but got ${userData.name}`);
      }
    }

    return { token, userData };
  }

  // Error message validation methods

  /**
   * Wait for error alert to appear
   */
  async waitForErrorAlert() {
    await this.waitForElement(this.selectors.alertDanger);
  }

  /**
   * Wait for success alert to appear
   */
  async waitForSuccessAlert() {
    await this.waitForElement(this.selectors.alertSuccess);
  }

  /**
   * Get current alert message text
   */
  async getAlertMessage() {
    await this.waitForElement(this.selectors.alertMessage);
    return await this.getElementText(this.selectors.alertMessage);
  }

  /**
   * Get error alert message text
   */
  async getErrorMessage() {
    await this.waitForErrorAlert();
    return await this.getElementText(this.selectors.alertDanger);
  }

  /**
   * Get success alert message text
   */
  async getSuccessMessage() {
    await this.waitForSuccessAlert();
    return await this.getElementText(this.selectors.alertSuccess);
  }

  /**
   * Verify specific error message is displayed
   * @param {string} expectedMessage - Expected error message
   */
  async verifyErrorMessage(expectedMessage) {
    const actualMessage = await this.getErrorMessage();
    if (!actualMessage.includes(expectedMessage)) {
      throw new Error(`Expected error message to contain "${expectedMessage}" but got "${actualMessage}"`);
    }
  }

  /**
   * Verify specific success message is displayed
   * @param {string} expectedMessage - Expected success message
   */
  async verifySuccessMessage(expectedMessage) {
    const actualMessage = await this.getSuccessMessage();
    if (!actualMessage.includes(expectedMessage)) {
      throw new Error(`Expected success message to contain "${expectedMessage}" but got "${actualMessage}"`);
    }
  }

  /**
   * Check if error alert is visible
   */
  async isErrorAlertVisible() {
    return await this.isElementVisible(this.selectors.alertDanger);
  }

  /**
   * Check if success alert is visible
   */
  async isSuccessAlertVisible() {
    return await this.isElementVisible(this.selectors.alertSuccess);
  }

  /**
   * Check if any alert is visible
   */
  async isAlertVisible() {
    return await this.isElementVisible(this.selectors.alertMessage);
  }

  /**
   * Close alert by clicking close button
   */
  async closeAlert() {
    if (await this.isElementVisible(this.selectors.alertCloseButton)) {
      await this.clickElement(this.selectors.alertCloseButton);
      await this.waitForElementHidden(this.selectors.alertMessage);
    }
  }

  /**
   * Wait for alert to disappear
   */
  async waitForAlertToDisappear() {
    await this.waitForElementHidden(this.selectors.alertMessage);
  }

  // Form validation methods

  /**
   * Verify login form is displayed
   */
  async verifyLoginFormDisplayed() {
    await this.assertElementVisible(this.selectors.loginForm);
    await this.assertElementVisible(this.selectors.loginEmailInput);
    await this.assertElementVisible(this.selectors.loginPasswordInput);
    await this.assertElementVisible(this.selectors.loginSubmitButton);
    await this.assertElementText(this.selectors.formTitle, 'Login');
  }

  /**
   * Verify registration form is displayed
   */
  async verifyRegistrationFormDisplayed() {
    await this.assertElementVisible(this.selectors.registerForm);
    await this.assertElementVisible(this.selectors.registerNameInput);
    await this.assertElementVisible(this.selectors.registerEmailInput);
    await this.assertElementVisible(this.selectors.registerPasswordInput);
    await this.assertElementVisible(this.selectors.registerConfirmPasswordInput);
    await this.assertElementVisible(this.selectors.registerSubmitButton);
    await this.assertElementText(this.selectors.formTitle, 'Register');
  }

  /**
   * Verify form switching works correctly
   */
  async verifyFormSwitching() {
    // Start with login form
    await this.verifyLoginFormDisplayed();
    
    // Switch to registration
    await this.switchToRegistration();
    await this.verifyRegistrationFormDisplayed();
    
    // Switch back to login
    await this.switchToLogin();
    await this.verifyLoginFormDisplayed();
  }

  /**
   * Get login form field values
   */
  async getLoginFormValues() {
    return {
      email: await this.page.inputValue(this.selectors.loginEmailInput),
      password: await this.page.inputValue(this.selectors.loginPasswordInput)
    };
  }

  /**
   * Get registration form field values
   */
  async getRegistrationFormValues() {
    return {
      name: await this.page.inputValue(this.selectors.registerNameInput),
      email: await this.page.inputValue(this.selectors.registerEmailInput),
      password: await this.page.inputValue(this.selectors.registerPasswordInput),
      confirmPassword: await this.page.inputValue(this.selectors.registerConfirmPasswordInput)
    };
  }

  /**
   * Clear all login form fields
   */
  async clearLoginForm() {
    await this.clearAndFill(this.selectors.loginEmailInput, '');
    await this.clearAndFill(this.selectors.loginPasswordInput, '');
  }

  /**
   * Clear all registration form fields
   */
  async clearRegistrationForm() {
    await this.clearAndFill(this.selectors.registerNameInput, '');
    await this.clearAndFill(this.selectors.registerEmailInput, '');
    await this.clearAndFill(this.selectors.registerPasswordInput, '');
    await this.clearAndFill(this.selectors.registerConfirmPasswordInput, '');
  }

  // Utility methods for testing scenarios

  /**
   * Test login with invalid credentials
   * @param {string} email - Email address
   * @param {string} password - Password
   * @param {string} expectedError - Expected error message
   */
  async testInvalidLogin(email, password, expectedError) {
    await this.loginAndWaitForError(email, password);
    await this.verifyErrorMessage(expectedError);
  }

  /**
   * Test registration with invalid data
   * @param {Object} userData - User registration data
   * @param {string} expectedError - Expected error message
   */
  async testInvalidRegistration(userData, expectedError) {
    await this.registerAndWaitForError(userData);
    await this.verifyErrorMessage(expectedError);
  }

  /**
   * Test successful login flow
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async testSuccessfulLogin(email, password) {
    await this.loginAndWaitForSuccess(email, password);
    await this.verifyAuthenticationState({ email });
    await this.verifyRedirectToDiary();
  }

  /**
   * Test successful registration flow
   * @param {Object} userData - User registration data
   */
  async testSuccessfulRegistration(userData) {
    await this.registerAndWaitForSuccess(userData);
    await this.verifyAuthenticationState({ 
      email: userData.email, 
      name: userData.name || userData.fullName 
    });
    await this.verifyRedirectToDiary();
  }

  /**
   * Verify page loads correctly
   */
  async verifyPageLoaded() {
    await this.assertElementVisible(this.selectors.loginCard);
    await this.assertElementVisible(this.selectors.loginHeader);
    await this.assertElementVisible(this.selectors.loginBody);
    await this.verifyLoginFormDisplayed();
  }
}

module.exports = LoginPage;