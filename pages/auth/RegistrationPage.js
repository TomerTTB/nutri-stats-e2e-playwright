/**
 * RegistrationPage class for user registration
 * Handles registration form interactions, validation error checking,
 * and successful registration verification
 */

const BasePage = require('../base/BasePage');

class RegistrationPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Page selectors
    this.selectors = {
      // Form containers
      loginForm: '#login-form',
      registerForm: '#register-form',
      alertContainer: '#alert-container',
      
      // Registration form elements
      nameInput: '#register-name',
      emailInput: '#register-email',
      passwordInput: '#register-password',
      confirmPasswordInput: '#register-confirm-password',
      submitButton: '#register-form button[type="submit"]',
      
      // Form switching
      formTitle: '#form-title',
      switchLink: '#switch-link',
      switchText: '#switch-text',
      
      // Alert elements
      alertMessage: '.alert',
      alertDanger: '.alert-danger',
      alertSuccess: '.alert-success',
      alertCloseButton: '.btn-close',
      
      // Form validation elements
      passwordHelpText: '#register-form .form-text',
      
      // Page elements
      loginCard: '.login-card',
      loginHeader: '.login-header',
      loginBody: '.login-body'
    };

    // Validation patterns
    this.validationPatterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&#^()\[\]{}+\-=_|:;"',./<>~`]{8,}$/,
      name: /^[a-zA-Z\s]{2,50}$/
    };

    // Error messages
    this.errorMessages = {
      passwordMismatch: 'Passwords do not match',
      weakPassword: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
      invalidEmail: 'Please enter a valid email address',
      emptyName: 'Full name is required',
      userExists: 'User already exists',
      networkError: 'Network error. Please try again.'
    };
  }

  /**
   * Navigate to registration page (login page with registration form)
   */
  async navigateToRegistration() {
    await this.navigate('/login.html');
    await this.waitForPageLoad();
    await this.switchToRegistrationForm();
  }

  /**
   * Switch to registration form from login form
   */
  async switchToRegistrationForm() {
    // Wait for login form to be visible first
    await this.waitForElement(this.selectors.loginForm);
    
    // Click switch link to show registration form
    await this.waitForElement(this.selectors.switchLink);
    await this.clickElement(this.selectors.switchLink);
    
    // Wait for registration form to be visible
    await this.waitForElement(this.selectors.registerForm);
    await this.assertElementVisible(this.selectors.registerForm);
    await this.assertElementText(this.selectors.formTitle, 'Register');
  }

  /**
   * Switch back to login form
   */
  async switchToLoginForm() {
    await this.waitForElement(this.selectors.switchLink);
    await this.clickElement(this.selectors.switchLink);
    await this.waitForElement(this.selectors.loginForm);
    await this.assertElementVisible(this.selectors.loginForm);
    await this.assertElementText(this.selectors.formTitle, 'Login');
  }

  /**
   * Wait for registration form to be fully loaded
   */
  async waitForRegistrationForm() {
    await this.waitForElement(this.selectors.registerForm);
    await this.assertElementVisible(this.selectors.nameInput);
    await this.assertElementVisible(this.selectors.emailInput);
    await this.assertElementVisible(this.selectors.passwordInput);
    await this.assertElementVisible(this.selectors.confirmPasswordInput);
    await this.assertElementVisible(this.selectors.submitButton);
  }

  // Registration form handling methods

  /**
   * Fill name field
   * @param {string} name - Full name
   */
  async fillName(name) {
    await this.waitForElement(this.selectors.nameInput);
    await this.clearAndFill(this.selectors.nameInput, name);
  }

  /**
   * Fill email field
   * @param {string} email - Email address
   */
  async fillEmail(email) {
    await this.waitForElement(this.selectors.emailInput);
    await this.clearAndFill(this.selectors.emailInput, email);
  }

  /**
   * Fill password field
   * @param {string} password - Password
   */
  async fillPassword(password) {
    await this.waitForElement(this.selectors.passwordInput);
    await this.clearAndFill(this.selectors.passwordInput, password);
  }

  /**
   * Fill confirm password field
   * @param {string} confirmPassword - Confirm password
   */
  async fillConfirmPassword(confirmPassword) {
    await this.waitForElement(this.selectors.confirmPasswordInput);
    await this.clearAndFill(this.selectors.confirmPasswordInput, confirmPassword);
  }

  /**
   * Click submit button
   */
  async clickSubmit() {
    await this.waitForElement(this.selectors.submitButton);
    await this.clickElement(this.selectors.submitButton);
  }

  /**
   * Fill all registration form fields
   * @param {Object} userData - User registration data
   */
  async fillRegistrationForm(userData) {
    await this.waitForRegistrationForm();
    
    if (userData.name || userData.fullName) {
      await this.fillName(userData.name || userData.fullName);
    }
    
    if (userData.email) {
      await this.fillEmail(userData.email);
    }
    
    if (userData.password) {
      await this.fillPassword(userData.password);
    }
    
    if (userData.confirmPassword || userData.password) {
      await this.fillConfirmPassword(userData.confirmPassword || userData.password);
    }
  }

  /**
   * Submit registration form
   */
  async submitRegistrationForm() {
    await this.clickSubmit();
  }

  /**
   * Complete registration process
   * @param {Object} userData - User registration data
   */
  async register(userData) {
    await this.fillRegistrationForm(userData);
    await this.submitRegistrationForm();
  }

  /**
   * Register and wait for success
   * @param {Object} userData - User registration data
   */
  async registerAndWaitForSuccess(userData) {
    await this.register(userData);
    await this.waitForSuccessAlert();
    await this.waitForRedirectToDiary();
  }

  /**
   * Register and wait for error
   * @param {Object} userData - User registration data
   */
  async registerAndWaitForError(userData) {
    await this.register(userData);
    await this.waitForErrorAlert();
  }

  // Validation error checking methods

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
   * Get current error message
   */
  async getErrorMessage() {
    await this.waitForErrorAlert();
    return await this.getElementText(this.selectors.alertDanger);
  }

  /**
   * Get current success message
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
   * Test password mismatch validation
   * @param {Object} userData - User data with mismatched passwords
   */
  async testPasswordMismatchValidation(userData) {
    const testData = {
      ...userData,
      confirmPassword: userData.password + '_different'
    };
    
    await this.registerAndWaitForError(testData);
    await this.verifyErrorMessage(this.errorMessages.passwordMismatch);
  }

  /**
   * Test weak password validation
   * @param {Object} userData - User data with weak password
   */
  async testWeakPasswordValidation(userData) {
    const testData = {
      ...userData,
      password: 'weak',
      confirmPassword: 'weak'
    };
    
    await this.registerAndWaitForError(testData);
    await this.verifyErrorMessage(this.errorMessages.weakPassword);
  }

  /**
   * Test invalid email validation
   * @param {Object} userData - User data with invalid email
   */
  async testInvalidEmailValidation(userData) {
    const testData = {
      ...userData,
      email: 'invalid-email'
    };
    
    await this.fillRegistrationForm(testData);
    
    // Check HTML5 validation (browser-level validation)
    const emailInput = await this.page.locator(this.selectors.emailInput);
    const isValid = await emailInput.evaluate(el => el.checkValidity());
    
    if (isValid) {
      throw new Error('Email input should be invalid but browser validation passed');
    }
  }

  /**
   * Test empty name validation
   * @param {Object} userData - User data with empty name
   */
  async testEmptyNameValidation(userData) {
    const testData = {
      ...userData,
      name: ''
    };
    
    await this.fillRegistrationForm(testData);
    
    // Check HTML5 validation for required field
    const nameInput = await this.page.locator(this.selectors.nameInput);
    const isValid = await nameInput.evaluate(el => el.checkValidity());
    
    if (isValid) {
      throw new Error('Name input should be invalid but browser validation passed');
    }
  }

  /**
   * Test duplicate user registration
   * @param {Object} userData - User data for existing user
   */
  async testDuplicateUserRegistration(userData) {
    await this.registerAndWaitForError(userData);
    await this.verifyErrorMessage(this.errorMessages.userExists);
  }

  // Successful registration verification methods

  /**
   * Wait for redirect to diary page after successful registration
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
   * Verify authentication state after successful registration
   * @param {Object} expectedUser - Expected user data (optional)
   */
  async verifyAuthenticationState(expectedUser = {}) {
    const authToken = await this.page.evaluate(() => localStorage.getItem('authToken'));
    const userDataStr = await this.page.evaluate(() => localStorage.getItem('user'));
    
    if (!authToken) {
      throw new Error('Auth token should be present after successful registration');
    }
    
    if (!userDataStr) {
      throw new Error('User data should be present after successful registration');
    }
    
    const userData = JSON.parse(userDataStr);
    
    if (expectedUser && expectedUser.email && userData.email !== expectedUser.email) {
      throw new Error(`Expected user email ${expectedUser.email} but got ${userData.email}`);
    }
    
    if (expectedUser && expectedUser.name && userData.name !== expectedUser.name) {
      throw new Error(`Expected user name ${expectedUser.name} but got ${userData.name}`);
    }
    
    return { token: authToken, userData };
  }

  /**
   * Verify successful registration flow
   * @param {Object} userData - User registration data
   */
  async verifySuccessfulRegistration(userData) {
    await this.verifySuccessMessage('Registration successful');
    await this.verifyRedirectToDiary();
    await this.verifyAuthenticationState({
      email: userData.email,
      name: userData.name || userData.fullName
    });
  }

  // Form field validation methods

  /**
   * Get all form field values
   */
  async getFormValues() {
    return {
      name: await this.page.inputValue(this.selectors.nameInput),
      email: await this.page.inputValue(this.selectors.emailInput),
      password: await this.page.inputValue(this.selectors.passwordInput),
      confirmPassword: await this.page.inputValue(this.selectors.confirmPasswordInput)
    };
  }

  /**
   * Get registration form field values (alias for getFormValues)
   */
  async getRegistrationFormValues() {
    return await this.getFormValues();
  }

  /**
   * Clear all form fields
   */
  async clearForm() {
    await this.clearAndFill(this.selectors.nameInput, '');
    await this.clearAndFill(this.selectors.emailInput, '');
    await this.clearAndFill(this.selectors.passwordInput, '');
    await this.clearAndFill(this.selectors.confirmPasswordInput, '');
  }

  /**
   * Clear registration form fields (alias for clearForm)
   */
  async clearRegistrationForm() {
    await this.clearForm();
  }

  /**
   * Switch to login form (alias for switchToLoginForm)
   */
  async switchToLogin() {
    await this.switchToLoginForm();
  }

  /**
   * Validate form data client-side
   * @param {Object} userData - User data to validate
   */
  validateFormData(userData) {
    const errors = [];
    
    // Validate name
    if (!userData.name && !userData.fullName) {
      errors.push('Name is required');
    } else {
      const name = userData.name || userData.fullName;
      if (!this.validationPatterns.name.test(name)) {
        errors.push('Name must be 2-50 characters and contain only letters and spaces');
      }
    }
    
    // Validate email
    if (!userData.email) {
      errors.push('Email is required');
    } else if (!this.validationPatterns.email.test(userData.email)) {
      errors.push('Invalid email format');
    }
    
    // Validate password
    if (!userData.password) {
      errors.push('Password is required');
    } else if (!this.validationPatterns.password.test(userData.password)) {
      errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
    }
    
    // Validate password confirmation
    if (!userData.confirmPassword) {
      errors.push('Password confirmation is required');
    } else if (userData.password !== userData.confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Test form validation with various invalid inputs
   * @param {Array} testCases - Array of test case objects
   */
  async testFormValidation(testCases) {
    const results = [];
    
    for (const testCase of testCases) {
      try {
        await this.clearForm();
        await this.registerAndWaitForError(testCase.userData);
        
        if (testCase.expectedError) {
          await this.verifyErrorMessage(testCase.expectedError);
        }
        
        results.push({
          testCase: testCase.name,
          success: true,
          error: null
        });
        
      } catch (error) {
        results.push({
          testCase: testCase.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Test successful registration with valid data
   * @param {Object} userData - Valid user registration data
   */
  async testSuccessfulRegistration(userData) {
    // Validate data client-side first
    const validation = this.validateFormData(userData);
    if (!validation.isValid) {
      throw new Error(`Invalid test data: ${validation.errors.join(', ')}`);
    }
    
    // Perform registration
    await this.registerAndWaitForSuccess(userData);
    await this.verifySuccessfulRegistration(userData);
  }

  /**
   * Verify registration form is displayed correctly
   */
  async verifyRegistrationFormDisplayed() {
    await this.assertElementVisible(this.selectors.registerForm);
    await this.assertElementVisible(this.selectors.nameInput);
    await this.assertElementVisible(this.selectors.emailInput);
    await this.assertElementVisible(this.selectors.passwordInput);
    await this.assertElementVisible(this.selectors.confirmPasswordInput);
    await this.assertElementVisible(this.selectors.submitButton);
    await this.assertElementText(this.selectors.formTitle, 'Register');
    
    // Verify password help text is visible
    await this.assertElementVisible(this.selectors.passwordHelpText);
    const helpText = await this.getElementText(this.selectors.passwordHelpText);
    if (!helpText.includes('8 characters')) {
      throw new Error('Password help text should mention 8 characters requirement');
    }
  }

  /**
   * Verify form switching between login and registration
   */
  async verifyFormSwitching() {
    // Should start with registration form visible
    await this.verifyRegistrationFormDisplayed();
    
    // Switch to login form
    await this.switchToLoginForm();
    await this.assertElementVisible(this.selectors.loginForm);
    await this.assertElementHidden(this.selectors.registerForm);
    
    // Switch back to registration form
    await this.switchToRegistrationForm();
    await this.verifyRegistrationFormDisplayed();
    await this.assertElementHidden(this.selectors.loginForm);
  }

  /**
   * Close any visible alerts
   */
  async closeAlert() {
    if (await this.isElementVisible(this.selectors.alertCloseButton)) {
      await this.clickElement(this.selectors.alertCloseButton);
      await this.waitForElementHidden(this.selectors.alertMessage);
    }
  }

  /**
   * Wait for alert to disappear automatically
   */
  async waitForAlertToDisappear() {
    await this.waitForElementHidden(this.selectors.alertMessage);
  }

  /**
   * Verify page loads correctly with registration form
   */
  async verifyPageLoaded() {
    await this.assertElementVisible(this.selectors.loginCard);
    await this.assertElementVisible(this.selectors.loginHeader);
    await this.assertElementVisible(this.selectors.loginBody);
    await this.verifyRegistrationFormDisplayed();
  }
}

module.exports = RegistrationPage;