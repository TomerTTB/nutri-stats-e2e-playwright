const BaseComponent = require('../base/BaseComponent');

/**
 * Navigation component class for main navigation functionality
 * Handles navigation menu interactions, user menu, and logout functionality
 */
class Navigation extends BaseComponent {
  constructor(page) {
    super(page, '.nav-container', 'Navigation');
    
    // Navigation selectors
    this.selectors = {
      navContainer: '.nav-container',
      navTabs: '.nav-tabs',
      navItems: '.nav-item',
      navLinks: '.nav-link',
      
      // Main navigation links
      diaryLink: 'a[href="/diary.html"]',
      reportsLink: 'a[href="/reports.html"]',
      foodsLink: 'a[href="/foods.html"]',
      settingsLink: 'a[href="/settings.html"]',
      docsLink: 'a[href="/docs/index.html"]',
      
      // User menu elements
      userMenu: '#userMenu',
      userInfo: '.user-info',
      userName: '#userName',
      logoutBtn: '#logoutBtn',
      loginPrompt: '#loginPrompt',
      loginLink: 'a[href="/login.html"]'
    };
  }

  // Navigation menu interaction methods

  /**
   * Navigate to Food Diary page
   */
  async navigateToDiary() {
    await this.page.click(this.selectors.diaryLink);
    await this.page.waitForURL('**/diary.html');
  }

  /**
   * Navigate to Reports page
   */
  async navigateToReports() {
    await this.page.click(this.selectors.reportsLink);
    await this.page.waitForURL('**/reports.html');
  }

  /**
   * Navigate to Foods Database page
   */
  async navigateToFoods() {
    await this.page.click(this.selectors.foodsLink);
    await this.page.waitForURL('**/foods.html');
  }

  /**
   * Navigate to Settings page
   */
  async navigateToSettings() {
    await this.page.click(this.selectors.settingsLink);
    await this.page.waitForURL('**/settings.html');
  }

  /**
   * Navigate to Documentation page
   */
  async navigateToDocumentation() {
    await this.page.click(this.selectors.docsLink);
    await this.page.waitForURL('**/docs/index.html');
  }

  /**
   * Navigate to Login page
   */
  async navigateToLogin() {
    await this.page.click(this.selectors.loginLink);
    await this.page.waitForURL('**/login.html');
  }

  /**
   * Get all navigation links
   */
  async getNavigationLinks() {
    await this.waitForVisible();
    const links = await this.page.locator(this.selectors.navLinks).all();
    const linkData = [];
    
    for (const link of links) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      const isVisible = await link.isVisible();
      linkData.push({ href, text: text?.trim(), isVisible });
    }
    
    return linkData;
  }

  /**
   * Get active navigation link
   */
  async getActiveLink() {
    await this.waitForVisible();
    const activeLink = this.page.locator(`${this.selectors.navLinks}.active`);
    
    if (await activeLink.count() > 0) {
      const href = await activeLink.getAttribute('href');
      const text = await activeLink.textContent();
      return { href, text: text?.trim() };
    }
    
    return null;
  }

  /**
   * Check if specific navigation link is active
   * @param {string} linkSelector - Selector for the navigation link
   */
  async isLinkActive(linkSelector) {
    const link = this.page.locator(linkSelector);
    const classes = await link.getAttribute('class');
    return classes?.includes('active') || false;
  }

  // User menu and logout functionality

  /**
   * Check if user is logged in (user menu is visible)
   */
  async isUserLoggedIn() {
    const userMenu = this.page.locator(this.selectors.userMenu);
    return await userMenu.isVisible();
  }

  /**
   * Check if login prompt is visible (user not logged in)
   */
  async isLoginPromptVisible() {
    const loginPrompt = this.page.locator(this.selectors.loginPrompt);
    return await loginPrompt.isVisible();
  }

  /**
   * Get logged in user name
   */
  async getUserName() {
    await this.waitForVisible();
    const userNameElement = this.page.locator(this.selectors.userName);
    
    if (await userNameElement.isVisible()) {
      return await userNameElement.textContent();
    }
    
    return null;
  }

  /**
   * Click logout button
   */
  async logout() {
    await this.waitForVisible();
    const logoutBtn = this.page.locator(this.selectors.logoutBtn);
    
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      // Wait for redirect to login page or for user menu to disappear
      await Promise.race([
        this.page.waitForURL('**/login.html'),
        this.page.locator(this.selectors.userMenu).waitFor({ state: 'hidden' })
      ]);
    } else {
      throw new Error('Logout button is not visible - user may not be logged in');
    }
  }

  /**
   * Wait for user authentication state to load
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForAuthStateLoad(timeout = 10000) {
    // Wait for either user menu or login prompt to be visible
    await Promise.race([
      this.page.locator(this.selectors.userMenu).waitFor({ state: 'visible', timeout }),
      this.page.locator(this.selectors.loginPrompt).waitFor({ state: 'visible', timeout })
    ]);
  }

  // Navigation state verification methods

  /**
   * Verify navigation is loaded and visible
   */
  async verifyNavigationLoaded() {
    await this.assertVisible('Navigation should be loaded and visible');
    
    const navTabs = this.page.locator(this.selectors.navTabs);
    await navTabs.waitFor({ state: 'visible' });
    
    // Verify main navigation links are present
    const expectedLinks = [
      this.selectors.diaryLink,
      this.selectors.reportsLink,
      this.selectors.foodsLink,
      this.selectors.settingsLink,
      this.selectors.docsLink
    ];
    
    for (const linkSelector of expectedLinks) {
      const link = this.page.locator(linkSelector);
      await link.waitFor({ state: 'visible' });
    }
  }

  /**
   * Verify user is logged in state
   * @param {string} expectedUserName - Expected user name (optional)
   */
  async verifyUserLoggedIn(expectedUserName = null) {
    await this.waitForAuthStateLoad();
    
    const isLoggedIn = await this.isUserLoggedIn();
    if (!isLoggedIn) {
      throw new Error('User should be logged in but user menu is not visible');
    }
    
    const loginPromptVisible = await this.isLoginPromptVisible();
    if (loginPromptVisible) {
      throw new Error('Login prompt should not be visible when user is logged in');
    }
    
    if (expectedUserName) {
      const actualUserName = await this.getUserName();
      if (actualUserName !== expectedUserName) {
        throw new Error(`Expected user name "${expectedUserName}" but got "${actualUserName}"`);
      }
    }
    
    // Verify logout button is visible
    const logoutBtn = this.page.locator(this.selectors.logoutBtn);
    await logoutBtn.waitFor({ state: 'visible' });
  }

  /**
   * Verify user is logged out state
   */
  async verifyUserLoggedOut() {
    await this.waitForAuthStateLoad();
    
    const isLoggedIn = await this.isUserLoggedIn();
    if (isLoggedIn) {
      throw new Error('User should be logged out but user menu is still visible');
    }
    
    const loginPromptVisible = await this.isLoginPromptVisible();
    if (!loginPromptVisible) {
      throw new Error('Login prompt should be visible when user is logged out');
    }
    
    // Verify login link is visible
    const loginLink = this.page.locator(this.selectors.loginLink);
    await loginLink.waitFor({ state: 'visible' });
  }

  /**
   * Verify current page matches navigation state
   * @param {string} expectedPage - Expected page ('diary', 'reports', 'foods', 'settings', 'docs')
   */
  async verifyCurrentPage(expectedPage) {
    const currentUrl = this.page.url();
    const expectedPath = `/${expectedPage}.html`;
    
    if (!currentUrl.includes(expectedPath)) {
      throw new Error(`Expected to be on ${expectedPage} page but current URL is ${currentUrl}`);
    }
    
    // Verify corresponding navigation link is active (if implemented)
    const linkSelectors = {
      diary: this.selectors.diaryLink,
      reports: this.selectors.reportsLink,
      foods: this.selectors.foodsLink,
      settings: this.selectors.settingsLink,
      docs: this.selectors.docsLink
    };
    
    const linkSelector = linkSelectors[expectedPage];
    if (linkSelector) {
      const link = this.page.locator(linkSelector);
      await link.waitFor({ state: 'visible' });
    }
  }

  /**
   * Verify navigation accessibility
   */
  async verifyAccessibility() {
    await this.waitForVisible();
    
    // Check that navigation has proper ARIA attributes
    const nav = this.page.locator(this.selectors.navContainer);
    const role = await nav.getAttribute('role');
    
    // Verify navigation links are keyboard accessible
    const navLinks = this.page.locator(this.selectors.navLinks);
    const linkCount = await navLinks.count();
    
    for (let i = 0; i < linkCount; i++) {
      const link = navLinks.nth(i);
      const tabIndex = await link.getAttribute('tabindex');
      const href = await link.getAttribute('href');
      
      // Links should be focusable and have valid href
      if (href && !href.startsWith('#')) {
        await link.focus();
        const isFocused = await link.evaluate(el => document.activeElement === el);
        if (!isFocused) {
          throw new Error(`Navigation link ${i} is not keyboard focusable`);
        }
      }
    }
  }

  /**
   * Get navigation menu state information
   */
  async getNavigationState() {
    await this.waitForVisible();
    
    const state = {
      isVisible: await this.isVisible(),
      isUserLoggedIn: await this.isUserLoggedIn(),
      userName: await this.getUserName(),
      currentUrl: this.page.url(),
      navigationLinks: await this.getNavigationLinks(),
      activeLink: await this.getActiveLink()
    };
    
    return state;
  }

  /**
   * Wait for navigation to complete after clicking a link
   * @param {string} expectedUrl - Expected URL pattern to wait for
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForNavigation(expectedUrl, timeout = 30000) {
    await this.page.waitForURL(expectedUrl, { timeout });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Perform complete logout flow with verification
   */
  async performLogout() {
    // Verify user is logged in before logout
    await this.verifyUserLoggedIn();
    
    // Perform logout
    await this.logout();
    
    // Verify logout was successful
    await this.verifyUserLoggedOut();
  }

  /**
   * Navigate to page and verify navigation completed
   * @param {string} page - Page to navigate to ('diary', 'reports', 'foods', 'settings', 'docs')
   */
  async navigateToPage(page) {
    const navigationMethods = {
      diary: () => this.navigateToDiary(),
      reports: () => this.navigateToReports(),
      foods: () => this.navigateToFoods(),
      settings: () => this.navigateToSettings(),
      docs: () => this.navigateToDocumentation()
    };
    
    const navigationMethod = navigationMethods[page];
    if (!navigationMethod) {
      throw new Error(`Unknown page: ${page}. Valid pages are: ${Object.keys(navigationMethods).join(', ')}`);
    }
    
    await navigationMethod();
    await this.verifyCurrentPage(page);
  }
}

module.exports = Navigation;