/**
 * BaseComponent class providing common functionality for reusable UI components
 * Includes visibility, click, input methods, and component state validation
 */
class BaseComponent {
  constructor(page, selector, name = 'Component') {
    this.page = page;
    this.selector = selector;
    this.name = name;
    this.timeout = 30000;
  }

  /**
   * Get the component locator
   */
  get locator() {
    return this.page.locator(this.selector);
  }

  /**
   * Wait for component to be visible
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForVisible(timeout = this.timeout) {
    await this.page.waitForSelector(this.selector, { state: 'visible', timeout });
  }

  /**
   * Wait for component to be hidden
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForHidden(timeout = this.timeout) {
    await this.page.waitForSelector(this.selector, { state: 'hidden', timeout });
  }

  /**
   * Wait for component to be attached to DOM
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForAttached(timeout = this.timeout) {
    await this.page.waitForSelector(this.selector, { state: 'attached', timeout });
  }

  /**
   * Wait for component to be detached from DOM
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForDetached(timeout = this.timeout) {
    await this.page.waitForSelector(this.selector, { state: 'detached', timeout });
  }

  // Visibility methods

  /**
   * Check if component is visible
   */
  async isVisible() {
    return await this.page.isVisible(this.selector);
  }

  /**
   * Check if component is hidden
   */
  async isHidden() {
    return await this.page.isHidden(this.selector);
  }

  /**
   * Check if component exists in DOM
   */
  async exists() {
    try {
      await this.page.waitForSelector(this.selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if component is enabled
   */
  async isEnabled() {
    return await this.page.isEnabled(this.selector);
  }

  /**
   * Check if component is disabled
   */
  async isDisabled() {
    return await this.page.isDisabled(this.selector);
  }

  /**
   * Check if component is checked (for checkboxes/radio buttons)
   */
  async isChecked() {
    return await this.page.isChecked(this.selector);
  }

  // Interaction methods

  /**
   * Click the component
   * @param {Object} options - Click options
   */
  async click(options = {}) {
    await this.waitForVisible();
    await this.page.click(this.selector, options);
  }

  /**
   * Double click the component
   * @param {Object} options - Click options
   */
  async doubleClick(options = {}) {
    await this.waitForVisible();
    await this.page.dblclick(this.selector, options);
  }

  /**
   * Right click the component
   * @param {Object} options - Click options
   */
  async rightClick(options = {}) {
    await this.waitForVisible();
    await this.page.click(this.selector, { ...options, button: 'right' });
  }

  /**
   * Hover over the component
   */
  async hover() {
    await this.waitForVisible();
    await this.page.hover(this.selector);
  }

  /**
   * Focus the component
   */
  async focus() {
    await this.waitForVisible();
    await this.page.focus(this.selector);
  }

  /**
   * Blur the component (remove focus)
   */
  async blur() {
    await this.page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) element.blur();
    }, this.selector);
  }

  /**
   * Scroll component into view
   */
  async scrollIntoView() {
    await this.locator.scrollIntoViewIfNeeded();
  }

  // Input methods

  /**
   * Fill input field (clears existing content)
   * @param {string} value - Value to fill
   */
  async fill(value) {
    await this.waitForVisible();
    await this.page.fill(this.selector, value);
  }

  /**
   * Type text into input field (doesn't clear existing content)
   * @param {string} text - Text to type
   * @param {Object} options - Type options
   */
  async type(text, options = {}) {
    await this.waitForVisible();
    await this.page.type(this.selector, text, options);
  }

  /**
   * Clear input field
   */
  async clear() {
    await this.waitForVisible();
    await this.page.fill(this.selector, '');
  }

  /**
   * Press key while component is focused
   * @param {string} key - Key to press
   */
  async pressKey(key) {
    await this.focus();
    await this.page.keyboard.press(key);
  }

  /**
   * Press multiple keys in sequence
   * @param {string[]} keys - Array of keys to press
   */
  async pressKeys(keys) {
    await this.focus();
    for (const key of keys) {
      await this.page.keyboard.press(key);
    }
  }

  /**
   * Select option from dropdown/select element
   * @param {string|string[]} value - Option value(s) to select
   */
  async selectOption(value) {
    await this.waitForVisible();
    await this.page.selectOption(this.selector, value);
  }

  /**
   * Check checkbox or radio button
   */
  async check() {
    await this.waitForVisible();
    await this.page.check(this.selector);
  }

  /**
   * Uncheck checkbox
   */
  async uncheck() {
    await this.waitForVisible();
    await this.page.uncheck(this.selector);
  }

  /**
   * Set checkbox state
   * @param {boolean} checked - Whether to check or uncheck
   */
  async setChecked(checked) {
    await this.waitForVisible();
    await this.page.setChecked(this.selector, checked);
  }

  // Content and attribute methods

  /**
   * Get component text content
   */
  async getText() {
    await this.waitForVisible();
    return await this.page.textContent(this.selector);
  }

  /**
   * Get component inner text
   */
  async getInnerText() {
    await this.waitForVisible();
    return await this.page.innerText(this.selector);
  }

  /**
   * Get component inner HTML
   */
  async getInnerHTML() {
    await this.waitForVisible();
    return await this.page.innerHTML(this.selector);
  }

  /**
   * Get component input value
   */
  async getValue() {
    await this.waitForVisible();
    return await this.page.inputValue(this.selector);
  }

  /**
   * Get component attribute value
   * @param {string} attribute - Attribute name
   */
  async getAttribute(attribute) {
    await this.waitForVisible();
    return await this.page.getAttribute(this.selector, attribute);
  }

  /**
   * Get component CSS property value
   * @param {string} property - CSS property name
   */
  async getCSSProperty(property) {
    await this.waitForVisible();
    return await this.page.evaluate(
      ({ selector, property }) => {
        const element = document.querySelector(selector);
        return element ? getComputedStyle(element)[property] : null;
      },
      { selector: this.selector, property }
    );
  }

  /**
   * Get component bounding box
   */
  async getBoundingBox() {
    await this.waitForVisible();
    return await this.locator.boundingBox();
  }

  /**
   * Get all matching elements count
   */
  async getCount() {
    return await this.locator.count();
  }

  // Component state validation utilities

  /**
   * Assert component is visible
   * @param {string} message - Custom error message
   */
  async assertVisible(message = '') {
    const isVisible = await this.isVisible();
    if (!isVisible) {
      const errorMsg = message || `${this.name} component should be visible`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component is hidden
   * @param {string} message - Custom error message
   */
  async assertHidden(message = '') {
    const isVisible = await this.isVisible();
    if (isVisible) {
      const errorMsg = message || `${this.name} component should be hidden`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component is enabled
   * @param {string} message - Custom error message
   */
  async assertEnabled(message = '') {
    const isEnabled = await this.isEnabled();
    if (!isEnabled) {
      const errorMsg = message || `${this.name} component should be enabled`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component is disabled
   * @param {string} message - Custom error message
   */
  async assertDisabled(message = '') {
    const isEnabled = await this.isEnabled();
    if (isEnabled) {
      const errorMsg = message || `${this.name} component should be disabled`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component text matches expected value
   * @param {string} expectedText - Expected text content
   * @param {string} message - Custom error message
   */
  async assertText(expectedText, message = '') {
    const actualText = await this.getText();
    if (actualText !== expectedText) {
      const errorMsg = message || `${this.name} text should be "${expectedText}" but was "${actualText}"`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component text contains expected value
   * @param {string} expectedText - Expected text to contain
   * @param {string} message - Custom error message
   */
  async assertTextContains(expectedText, message = '') {
    const actualText = await this.getText();
    if (!actualText.includes(expectedText)) {
      const errorMsg = message || `${this.name} text should contain "${expectedText}" but was "${actualText}"`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component value matches expected value
   * @param {string} expectedValue - Expected input value
   * @param {string} message - Custom error message
   */
  async assertValue(expectedValue, message = '') {
    const actualValue = await this.getValue();
    if (actualValue !== expectedValue) {
      const errorMsg = message || `${this.name} value should be "${expectedValue}" but was "${actualValue}"`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component attribute matches expected value
   * @param {string} attribute - Attribute name
   * @param {string} expectedValue - Expected attribute value
   * @param {string} message - Custom error message
   */
  async assertAttribute(attribute, expectedValue, message = '') {
    const actualValue = await this.getAttribute(attribute);
    if (actualValue !== expectedValue) {
      const errorMsg = message || `${this.name} ${attribute} should be "${expectedValue}" but was "${actualValue}"`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component is checked
   * @param {string} message - Custom error message
   */
  async assertChecked(message = '') {
    const isChecked = await this.isChecked();
    if (!isChecked) {
      const errorMsg = message || `${this.name} should be checked`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component is unchecked
   * @param {string} message - Custom error message
   */
  async assertUnchecked(message = '') {
    const isChecked = await this.isChecked();
    if (isChecked) {
      const errorMsg = message || `${this.name} should be unchecked`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Assert component count matches expected value
   * @param {number} expectedCount - Expected element count
   * @param {string} message - Custom error message
   */
  async assertCount(expectedCount, message = '') {
    const actualCount = await this.getCount();
    if (actualCount !== expectedCount) {
      const errorMsg = message || `${this.name} count should be ${expectedCount} but was ${actualCount}`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Wait for component text to match expected value
   * @param {string} expectedText - Expected text content
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForText(expectedText, timeout = this.timeout) {
    await this.page.waitForFunction(
      ({ selector, expectedText }) => {
        const element = document.querySelector(selector);
        return element && element.textContent === expectedText;
      },
      { selector: this.selector, expectedText },
      { timeout }
    );
  }

  /**
   * Wait for component to contain specific text
   * @param {string} expectedText - Expected text to contain
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForTextContains(expectedText, timeout = this.timeout) {
    await this.page.waitForFunction(
      ({ selector, expectedText }) => {
        const element = document.querySelector(selector);
        return element && element.textContent.includes(expectedText);
      },
      { selector: this.selector, expectedText },
      { timeout }
    );
  }

  /**
   * Wait for component value to match expected value
   * @param {string} expectedValue - Expected input value
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForValue(expectedValue, timeout = this.timeout) {
    await this.page.waitForFunction(
      ({ selector, expectedValue }) => {
        const element = document.querySelector(selector);
        return element && element.value === expectedValue;
      },
      { selector: this.selector, expectedValue },
      { timeout }
    );
  }

  /**
   * Wait for component attribute to match expected value
   * @param {string} attribute - Attribute name
   * @param {string} expectedValue - Expected attribute value
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForAttribute(attribute, expectedValue, timeout = this.timeout) {
    await this.page.waitForFunction(
      ({ selector, attribute, expectedValue }) => {
        const element = document.querySelector(selector);
        return element && element.getAttribute(attribute) === expectedValue;
      },
      { selector: this.selector, attribute, expectedValue },
      { timeout }
    );
  }

  /**
   * Execute action with retry logic
   * @param {Function} action - Action to execute
   * @param {number} retries - Number of retries
   * @param {string} context - Context for error handling
   */
  async executeWithRetry(action, retries = 2, context = 'component action') {
    let lastError;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        if (i < retries) {
          console.warn(`Retry ${i + 1}/${retries} for ${this.name} ${context}:`, error.message);
          await this.page.waitForTimeout(1000); // Wait 1 second before retry
        }
      }
    }
    
    throw new Error(`${this.name} ${context} failed after ${retries + 1} attempts: ${lastError.message}`);
  }

  /**
   * Get component screenshot
   * @param {string} name - Screenshot name
   * @param {Object} options - Screenshot options
   */
  async takeScreenshot(name, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const defaultOptions = {
      path: `e2e-tests/screenshots/${filename}`
    };
    await this.locator.screenshot({ ...defaultOptions, ...options });
    return filename;
  }
}

module.exports = BaseComponent;