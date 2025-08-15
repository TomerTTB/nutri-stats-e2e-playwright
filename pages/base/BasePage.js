/**
 * BasePage class providing common functionality for all page objects
 * Includes navigation, waiting, screenshot utilities, assertions, and error handling
 */
class BasePage {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:8080';
    this.timeout = 30000;
  }

  /**
   * Navigate to a specific path
   * @param {string} path - The path to navigate to (relative to baseUrl)
   */
  async navigate(path = '') {
    const url = `${this.baseUrl}${path}`;
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for DOM content to be loaded
   */
  async waitForDOMContentLoaded() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for an element to be visible
   * @param {string} selector - Element selector
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForElement(selector, timeout = this.timeout) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for an element to be hidden
   * @param {string} selector - Element selector
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForElementHidden(selector, timeout = this.timeout) {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Wait for page URL to match a pattern
   * @param {string|RegExp} urlPattern - URL pattern to match
   */
  async waitForURL(urlPattern) {
    await this.page.waitForURL(urlPattern);
  }

  /**
   * Take a screenshot with timestamp
   * @param {string} name - Screenshot name
   * @param {Object} options - Screenshot options
   */
  async takeScreenshot(name, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const defaultOptions = {
      path: `e2e-tests/screenshots/${filename}`,
      fullPage: true
    };
    await this.page.screenshot({ ...defaultOptions, ...options });
    return filename;
  }

  /**
   * Get current page URL
   */
  getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getPageTitle() {
    return await this.page.title();
  }

  /**
   * Check if element exists on page
   * @param {string} selector - Element selector
   */
  async elementExists(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if element is visible
   * @param {string} selector - Element selector
   */
  async isElementVisible(selector) {
    return await this.page.isVisible(selector);
  }

  /**
   * Check if element is enabled
   * @param {string} selector - Element selector
   */
  async isElementEnabled(selector) {
    return await this.page.isEnabled(selector);
  }

  /**
   * Get element text content
   * @param {string} selector - Element selector
   */
  async getElementText(selector) {
    return await this.page.textContent(selector);
  }

  /**
   * Get element attribute value
   * @param {string} selector - Element selector
   * @param {string} attribute - Attribute name
   */
  async getElementAttribute(selector, attribute) {
    return await this.page.getAttribute(selector, attribute);
  }

  /**
   * Click element with retry logic
   * @param {string} selector - Element selector
   * @param {Object} options - Click options
   */
  async clickElement(selector, options = {}) {
    await this.waitForElement(selector);
    await this.page.click(selector, options);
  }

  /**
   * Fill input field
   * @param {string} selector - Input selector
   * @param {string} value - Value to fill
   */
  async fillInput(selector, value) {
    await this.waitForElement(selector);
    await this.page.fill(selector, value);
  }

  /**
   * Clear and fill input field
   * @param {string} selector - Input selector
   * @param {string} value - Value to fill
   */
  async clearAndFill(selector, value) {
    await this.waitForElement(selector);
    await this.page.fill(selector, '');
    await this.page.fill(selector, value);
  }

  /**
   * Select option from dropdown
   * @param {string} selector - Select element selector
   * @param {string} value - Option value to select
   */
  async selectOption(selector, value) {
    await this.waitForElement(selector);
    await this.page.selectOption(selector, value);
  }

  /**
   * Scroll element into view
   * @param {string} selector - Element selector
   */
  async scrollToElement(selector) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Hover over element
   * @param {string} selector - Element selector
   */
  async hoverElement(selector) {
    await this.waitForElement(selector);
    await this.page.hover(selector);
  }

  /**
   * Press keyboard key
   * @param {string} key - Key to press
   */
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  /**
   * Reload the current page
   */
  async reloadPage() {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Go back in browser history
   */
  async goBack() {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  /**
   * Go forward in browser history
   */
  async goForward() {
    await this.page.goForward();
    await this.waitForPageLoad();
  }

  // Common assertion methods

  /**
   * Assert element is visible
   * @param {string} selector - Element selector
   * @param {string} message - Custom error message
   */
  async assertElementVisible(selector, message = '') {
    const isVisible = await this.isElementVisible(selector);
    if (!isVisible) {
      const errorMsg = message || `Element ${selector} should be visible`;
      await this.takeScreenshot('assertion-failed-element-not-visible');
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert element is hidden
   * @param {string} selector - Element selector
   * @param {string} message - Custom error message
   */
  async assertElementHidden(selector, message = '') {
    const isVisible = await this.isElementVisible(selector);
    if (isVisible) {
      const errorMsg = message || `Element ${selector} should be hidden`;
      await this.takeScreenshot('assertion-failed-element-visible');
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert element text matches expected value
   * @param {string} selector - Element selector
   * @param {string} expectedText - Expected text content
   * @param {string} message - Custom error message
   */
  async assertElementText(selector, expectedText, message = '') {
    const actualText = await this.getElementText(selector);
    if (actualText !== expectedText) {
      const errorMsg = message || `Element ${selector} text should be "${expectedText}" but was "${actualText}"`;
      await this.takeScreenshot('assertion-failed-text-mismatch');
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert element text contains expected value
   * @param {string} selector - Element selector
   * @param {string} expectedText - Expected text to contain
   * @param {string} message - Custom error message
   */
  async assertElementTextContains(selector, expectedText, message = '') {
    const actualText = await this.getElementText(selector);
    if (!actualText.includes(expectedText)) {
      const errorMsg = message || `Element ${selector} text should contain "${expectedText}" but was "${actualText}"`;
      await this.takeScreenshot('assertion-failed-text-not-contains');
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert current URL matches expected pattern
   * @param {string|RegExp} expectedUrl - Expected URL or pattern
   * @param {string} message - Custom error message
   */
  async assertCurrentUrl(expectedUrl, message = '') {
    const currentUrl = this.getCurrentUrl();
    const matches = typeof expectedUrl === 'string' 
      ? currentUrl === expectedUrl 
      : expectedUrl.test(currentUrl);
    
    if (!matches) {
      const errorMsg = message || `Current URL should match "${expectedUrl}" but was "${currentUrl}"`;
      await this.takeScreenshot('assertion-failed-url-mismatch');
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert page title matches expected value
   * @param {string} expectedTitle - Expected page title
   * @param {string} message - Custom error message
   */
  async assertPageTitle(expectedTitle, message = '') {
    const actualTitle = await this.getPageTitle();
    if (actualTitle !== expectedTitle) {
      const errorMsg = message || `Page title should be "${expectedTitle}" but was "${actualTitle}"`;
      await this.takeScreenshot('assertion-failed-title-mismatch');
      throw new Error(errorMsg);
    }
  }

  // Error handling and debugging

  /**
   * Handle and log errors with screenshot
   * @param {Error} error - The error to handle
   * @param {string} context - Context information
   */
  async handleError(error, context = '') {
    const timestamp = new Date().toISOString();
    const screenshotName = `error-${context}-${timestamp}`;
    
    try {
      await this.takeScreenshot(screenshotName);
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError);
    }
    
    console.error(`Error in ${context} at ${timestamp}:`, error);
    throw error;
  }

  /**
   * Execute action with error handling and retry
   * @param {Function} action - Action to execute
   * @param {number} retries - Number of retries
   * @param {string} context - Context for error handling
   */
  async executeWithRetry(action, retries = 2, context = 'action') {
    let lastError;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        if (i < retries) {
          console.warn(`Retry ${i + 1}/${retries} for ${context}:`, error.message);
          await this.page.waitForTimeout(1000); // Wait 1 second before retry
        }
      }
    }
    
    await this.handleError(lastError, context);
  }

  // Page state management

  /**
   * Save current page state
   */
  async savePageState() {
    return {
      url: this.getCurrentUrl(),
      title: await this.getPageTitle(),
      localStorage: await this.page.evaluate(() => JSON.stringify(localStorage)),
      sessionStorage: await this.page.evaluate(() => JSON.stringify(sessionStorage))
    };
  }

  /**
   * Restore page state
   * @param {Object} state - Previously saved state
   */
  async restorePageState(state) {
    if (state.url !== this.getCurrentUrl()) {
      await this.navigate(state.url.replace(this.baseUrl, ''));
    }
    
    if (state.localStorage) {
      await this.page.evaluate((data) => {
        const storage = JSON.parse(data);
        for (const [key, value] of Object.entries(storage)) {
          localStorage.setItem(key, value);
        }
      }, state.localStorage);
    }
    
    if (state.sessionStorage) {
      await this.page.evaluate((data) => {
        const storage = JSON.parse(data);
        for (const [key, value] of Object.entries(storage)) {
          sessionStorage.setItem(key, value);
        }
      }, state.sessionStorage);
    }
  }

  /**
   * Clear browser storage
   */
  async clearStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}

module.exports = BasePage;