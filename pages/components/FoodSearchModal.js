const BaseComponent = require('../base/BaseComponent');

/**
 * FoodSearchModal component class for food search functionality
 * Handles food search input, result interactions, food selection, and quantity input
 */
class FoodSearchModal extends BaseComponent {
  constructor(page, mealId = null, rowIndex = null) {
    super(page, '.food-search-container', 'FoodSearchModal');
    this.mealId = mealId;
    this.rowIndex = rowIndex;
    
    // Food search selectors
    this.selectors = {
      // Container and input
      searchContainer: '.food-search-container',
      searchInput: '.food-search-input',
      
      // Results dropdown
      resultsDropdown: '.food-search-results',
      resultItem: '.food-search-item',
      selectedItem: '.food-search-item.selected',
      
      // Related elements in the meal row
      amountInput: 'input[type="number"]',
      nutritionalValues: '.nutritional-value',
      
      // Specific nutritional value positions
      caloriesValue: '.nutritional-value:nth-child(1)',
      carbsValue: '.nutritional-value:nth-child(2)',
      proteinValue: '.nutritional-value:nth-child(3)',
      fatValue: '.nutritional-value:nth-child(4)',
      proteinGeneralValue: '.nutritional-value:nth-child(5)'
    };
  }

  // Search input and result interaction methods

  /**
   * Type in the food search input
   * @param {string} searchTerm - Text to search for
   */
  async searchForFood(searchTerm) {
    // If we have specific meal and row context, use it
    if (this.mealId !== null && this.rowIndex !== null) {
      const mealSection = this.page.locator(`[data-meal-id="${this.mealId}"]`);
      const rows = mealSection.locator('tbody tr');
      const targetRow = rows.nth(this.rowIndex);
      const searchInput = targetRow.locator(this.selectors.searchInput);
      await searchInput.fill(searchTerm);
    } else {
      // Fallback to first visible search input
      const searchInputs = this.page.locator(this.selectors.searchInput);
      const count = await searchInputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = searchInputs.nth(i);
        if (await input.isVisible()) {
          await input.fill(searchTerm);
          break;
        }
      }
    }
    
    // Wait for search results to appear if there are matches
    if (searchTerm.trim()) {
      try {
        await this.waitForResultsVisible();
      } catch (error) {
        // Results might not appear if no matches found
        console.log('No search results appeared for:', searchTerm);
      }
    }
  }

  /**
   * Clear the search input
   */
  async clearSearch() {
    // If we have specific meal and row context, use it
    if (this.mealId !== null && this.rowIndex !== null) {
      const mealSection = this.page.locator(`[data-meal-id="${this.mealId}"]`);
      const rows = mealSection.locator('tbody tr');
      const targetRow = rows.nth(this.rowIndex);
      const searchInput = targetRow.locator(this.selectors.searchInput);
      await searchInput.fill('');
    } else {
      // Fallback to first visible search input
      const searchInputs = this.page.locator(this.selectors.searchInput);
      const count = await searchInputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = searchInputs.nth(i);
        if (await input.isVisible()) {
          await input.fill('');
          break;
        }
      }
    }
    
    await this.waitForResultsHidden();
  }

  /**
   * Get the current search input value
   */
  async getSearchValue() {
    // If we have specific meal and row context, use it
    if (this.mealId !== null && this.rowIndex !== null) {
      const mealSection = this.page.locator(`[data-meal-id="${this.mealId}"]`);
      const rows = mealSection.locator('tbody tr');
      const targetRow = rows.nth(this.rowIndex);
      const searchInput = targetRow.locator(this.selectors.searchInput);
      return await searchInput.inputValue();
    } else {
      // Fallback to first visible search input
      const searchInputs = this.page.locator(this.selectors.searchInput);
      const count = await searchInputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = searchInputs.nth(i);
        if (await input.isVisible()) {
          return await input.inputValue();
        }
      }
      return '';
    }
  }

  /**
   * Focus on the search input
   */
  async focusSearchInput() {
    // If we have specific meal and row context, use it
    if (this.mealId !== null && this.rowIndex !== null) {
      const mealSection = this.page.locator(`[data-meal-id="${this.mealId}"]`);
      const rows = mealSection.locator('tbody tr');
      const targetRow = rows.nth(this.rowIndex);
      const searchInput = targetRow.locator(this.selectors.searchInput);
      await searchInput.focus();
    } else {
      // Fallback to first visible search input
      const searchInputs = this.page.locator(this.selectors.searchInput);
      const count = await searchInputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = searchInputs.nth(i);
        if (await input.isVisible()) {
          await input.focus();
          break;
        }
      }
    }
  }

  /**
   * Check if search results dropdown is visible
   */
  async isResultsDropdownVisible() {
    // Find the visible dropdown (the one with results)
    const dropdowns = this.page.locator(this.selectors.resultsDropdown);
    const count = await dropdowns.count();
    
    for (let i = 0; i < count; i++) {
      const dropdown = dropdowns.nth(i);
      if (await dropdown.isVisible()) {
        const hasResults = await dropdown.locator(this.selectors.resultItem).count() > 0;
        if (hasResults) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Wait for search results to be visible
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForResultsVisible(timeout = 5000) {
    // Wait for any results dropdown to be visible with actual results
    await this.page.waitForFunction(() => {
      const dropdowns = document.querySelectorAll('.food-search-results');
      for (const dropdown of dropdowns) {
        if (dropdown.style.display !== 'none' && dropdown.children.length > 0) {
          return true;
        }
      }
      return false;
    }, {}, { timeout });
  }

  /**
   * Wait for search results to be hidden
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForResultsHidden(timeout = 2000) {
    // Wait for all results dropdowns to be hidden or empty
    try {
      await this.page.waitForFunction(() => {
        const dropdowns = document.querySelectorAll('.food-search-results');
        for (const dropdown of dropdowns) {
          if (dropdown.style.display !== 'none' && dropdown.children.length > 0) {
            return false;
          }
        }
        return true;
      }, {}, { timeout });
    } catch (error) {
      // If timeout, that's okay - results might still be visible
      console.log('Results may still be visible after timeout');
    }
  }

  /**
   * Get all search result items
   */
  async getSearchResults() {
    await this.waitForResultsVisible();
    
    // Find the visible dropdown with results
    const dropdowns = this.page.locator(this.selectors.resultsDropdown);
    const count = await dropdowns.count();
    
    for (let i = 0; i < count; i++) {
      const dropdown = dropdowns.nth(i);
      if (await dropdown.isVisible()) {
        const resultItems = dropdown.locator(this.selectors.resultItem);
        const itemCount = await resultItems.count();
        
        if (itemCount > 0) {
          const results = [];
          for (let j = 0; j < itemCount; j++) {
            const item = resultItems.nth(j);
            const text = await item.textContent();
            const foodData = await item.getAttribute('data-food');
            results.push({
              text: text?.trim(),
              foodData: foodData ? JSON.parse(foodData) : null,
              index: j
            });
          }
          return results;
        }
      }
    }
    
    return [];
  }

  /**
   * Get the count of search result items
   */
  async getResultsCount() {
    if (!(await this.isResultsDropdownVisible())) {
      return 0;
    }
    
    // Find the visible dropdown with results
    const dropdowns = this.page.locator(this.selectors.resultsDropdown);
    const count = await dropdowns.count();
    
    for (let i = 0; i < count; i++) {
      const dropdown = dropdowns.nth(i);
      if (await dropdown.isVisible()) {
        const resultItems = dropdown.locator(this.selectors.resultItem);
        const itemCount = await resultItems.count();
        if (itemCount > 0) {
          return itemCount;
        }
      }
    }
    
    return 0;
  }

  /**
   * Get the currently selected search result item
   */
  async getSelectedResult() {
    const selectedItem = this.page.locator(this.selectors.selectedItem);
    
    if (await selectedItem.count() > 0) {
      const text = await selectedItem.textContent();
      const foodData = await selectedItem.getAttribute('data-food');
      return {
        text: text?.trim(),
        foodData: foodData ? JSON.parse(foodData) : null
      };
    }
    
    return null;
  }

  // Food selection and quantity input handling

  /**
   * Select a food item by clicking on it
   * @param {number} index - Index of the result item to select
   */
  async selectFoodByIndex(index) {
    await this.waitForResultsVisible();
    
    // Find the visible dropdown with results
    const dropdowns = this.page.locator(this.selectors.resultsDropdown);
    const count = await dropdowns.count();
    
    for (let i = 0; i < count; i++) {
      const dropdown = dropdowns.nth(i);
      if (await dropdown.isVisible()) {
        const resultItems = dropdown.locator(this.selectors.resultItem);
        const itemCount = await resultItems.count();
        
        if (itemCount > index) {
          const item = resultItems.nth(index);
          await item.click();
          await this.waitForResultsHidden();
          return;
        }
      }
    }
    
    throw new Error(`Could not find result item at index ${index}`);
  }

  /**
   * Select a food item by its name
   * @param {string} foodName - Name of the food to select
   */
  async selectFoodByName(foodName) {
    await this.waitForResultsVisible();
    
    // Find the visible dropdown with results
    const dropdowns = this.page.locator(this.selectors.resultsDropdown);
    const count = await dropdowns.count();
    
    for (let i = 0; i < count; i++) {
      const dropdown = dropdowns.nth(i);
      if (await dropdown.isVisible()) {
        const resultItem = dropdown.locator(this.selectors.resultItem, { hasText: foodName });
        
        if (await resultItem.count() > 0) {
          await resultItem.click();
          await this.waitForResultsHidden();
          return;
        }
      }
    }
    
    throw new Error(`Food item "${foodName}" not found in search results`);
  }

  /**
   * Select food using keyboard navigation
   * @param {number} steps - Number of steps to navigate (positive for down, negative for up)
   */
  async navigateAndSelectFood(steps = 0) {
    await this.focusSearchInput();
    
    // Navigate through results
    for (let i = 0; i < Math.abs(steps); i++) {
      const key = steps > 0 ? 'ArrowDown' : 'ArrowUp';
      await this.page.keyboard.press(key);
    }
    
    // Select the highlighted item
    await this.page.keyboard.press('Enter');
    await this.waitForResultsHidden();
  }

  /**
   * Search for and select a food item in one action
   * @param {string} searchTerm - Text to search for
   * @param {string|number} selector - Food name or index to select
   */
  async searchAndSelectFood(searchTerm, selector) {
    await this.searchForFood(searchTerm);
    
    if (typeof selector === 'number') {
      await this.selectFoodByIndex(selector);
    } else {
      await this.selectFoodByName(selector);
    }
  }

  /**
   * Get the selected food data from the input
   */
  async getSelectedFoodData() {
    // If we have specific meal and row context, use it
    if (this.mealId !== null && this.rowIndex !== null) {
      const mealSection = this.page.locator(`[data-meal-id="${this.mealId}"]`);
      const rows = mealSection.locator('tbody tr');
      const targetRow = rows.nth(this.rowIndex);
      const searchInput = targetRow.locator(this.selectors.searchInput);
      const foodDataAttr = await searchInput.getAttribute('data-food');
      
      if (foodDataAttr) {
        return JSON.parse(foodDataAttr);
      }
    } else {
      // Fallback to first input with data-food attribute
      const searchInputs = this.page.locator(this.selectors.searchInput);
      const count = await searchInputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = searchInputs.nth(i);
        const foodDataAttr = await input.getAttribute('data-food');
        if (foodDataAttr) {
          return JSON.parse(foodDataAttr);
        }
      }
    }
    
    return null;
  }

  /**
   * Set the quantity/amount for the selected food
   * @param {string|number} amount - Amount to set
   */
  async setFoodAmount(amount) {
    // If we have specific meal and row context, use it
    if (this.mealId !== null && this.rowIndex !== null) {
      const mealSection = this.page.locator(`[data-meal-id="${this.mealId}"]`);
      const rows = mealSection.locator('tbody tr');
      const targetRow = rows.nth(this.rowIndex);
      const amountInput = targetRow.locator(this.selectors.amountInput);
      
      await amountInput.fill(String(amount));
      await amountInput.dispatchEvent('change');
    } else {
      // Fallback to the original method
      const row = await this.getParentRow();
      const amountInput = row.locator(this.selectors.amountInput);
      
      await amountInput.fill(String(amount));
      await amountInput.dispatchEvent('change');
    }
  }

  /**
   * Get the current food amount
   */
  async getFoodAmount() {
    // If we have specific meal and row context, use it
    if (this.mealId !== null && this.rowIndex !== null) {
      const mealSection = this.page.locator(`[data-meal-id="${this.mealId}"]`);
      const rows = mealSection.locator('tbody tr');
      const targetRow = rows.nth(this.rowIndex);
      const amountInput = targetRow.locator(this.selectors.amountInput);
      return await amountInput.inputValue();
    } else {
      // Fallback to the original method
      const row = await this.getParentRow();
      const amountInput = row.locator(this.selectors.amountInput);
      return await amountInput.inputValue();
    }
  }

  /**
   * Get the base amount for the selected food
   */
  async getBaseFoodAmount() {
    // If we have specific meal and row context, use it
    if (this.mealId !== null && this.rowIndex !== null) {
      const mealSection = this.page.locator(`[data-meal-id="${this.mealId}"]`);
      const rows = mealSection.locator('tbody tr');
      const targetRow = rows.nth(this.rowIndex);
      const amountInput = targetRow.locator(this.selectors.amountInput);
      return await amountInput.getAttribute('data-base-amount');
    } else {
      // Fallback to the original method
      const row = await this.getParentRow();
      const amountInput = row.locator(this.selectors.amountInput);
      return await amountInput.getAttribute('data-base-amount');
    }
  }

  // Search result validation utilities

  /**
   * Verify search results contain expected food items
   * @param {string[]} expectedFoods - Array of expected food names
   */
  async verifySearchResults(expectedFoods) {
    const results = await this.getSearchResults();
    const resultNames = results.map(r => r.text);
    
    for (const expectedFood of expectedFoods) {
      if (!resultNames.some(name => name.includes(expectedFood))) {
        throw new Error(`Expected food "${expectedFood}" not found in search results: ${resultNames.join(', ')}`);
      }
    }
  }

  /**
   * Verify search results are filtered correctly
   * @param {string} searchTerm - The search term used
   */
  async verifyResultsFiltering(searchTerm) {
    const results = await this.getSearchResults();
    const searchTermLower = searchTerm.toLowerCase();
    
    for (const result of results) {
      if (!result.text.toLowerCase().includes(searchTermLower)) {
        throw new Error(`Search result "${result.text}" does not contain search term "${searchTerm}"`);
      }
    }
  }

  /**
   * Verify no search results are shown
   */
  async verifyNoResults() {
    const isVisible = await this.isResultsDropdownVisible();
    if (isVisible) {
      const count = await this.getResultsCount();
      if (count > 0) {
        throw new Error(`Expected no search results but found ${count} results`);
      }
    }
  }

  /**
   * Verify search results count
   * @param {number} expectedCount - Expected number of results
   */
  async verifyResultsCount(expectedCount) {
    if (expectedCount === 0) {
      await this.verifyNoResults();
      return;
    }
    
    await this.waitForResultsVisible();
    const actualCount = await this.getResultsCount();
    
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} search results but found ${actualCount}`);
    }
  }

  /**
   * Verify food selection was successful
   * @param {string} expectedFoodName - Expected selected food name
   * @param {Object} expectedNutrition - Expected nutritional values (optional)
   */
  async verifyFoodSelection(expectedFoodName, expectedNutrition = null) {
    // Verify search input shows selected food
    const searchValue = await this.getSearchValue();
    if (searchValue !== expectedFoodName) {
      throw new Error(`Expected selected food "${expectedFoodName}" but input shows "${searchValue}"`);
    }
    
    // Verify food data is stored
    const foodData = await this.getSelectedFoodData();
    if (!foodData) {
      throw new Error('No food data found after selection');
    }
    
    if (foodData.item !== expectedFoodName) {
      throw new Error(`Expected food data for "${expectedFoodName}" but got "${foodData.item}"`);
    }
    
    // Verify nutritional values if provided
    if (expectedNutrition) {
      await this.verifyNutritionalValues(expectedNutrition);
    }
    
    // Verify results dropdown is hidden
    const isVisible = await this.isResultsDropdownVisible();
    if (isVisible) {
      throw new Error('Search results dropdown should be hidden after food selection');
    }
  }

  /**
   * Verify nutritional values are displayed correctly
   * @param {Object} expectedValues - Expected nutritional values
   */
  async verifyNutritionalValues(expectedValues) {
    const row = await this.getParentRow();
    const nutritionalValues = row.locator(this.selectors.nutritionalValues);
    const count = await nutritionalValues.count();
    
    if (count < 5) {
      throw new Error(`Expected at least 5 nutritional value elements but found ${count}`);
    }
    
    const actualValues = {};
    if (expectedValues.calories !== undefined) {
      actualValues.calories = await nutritionalValues.nth(0).textContent();
    }
    if (expectedValues.carbs !== undefined) {
      actualValues.carbs = await nutritionalValues.nth(1).textContent();
    }
    if (expectedValues.protein !== undefined) {
      actualValues.protein = await nutritionalValues.nth(2).textContent();
    }
    if (expectedValues.fat !== undefined) {
      actualValues.fat = await nutritionalValues.nth(3).textContent();
    }
    if (expectedValues.proteinGeneral !== undefined) {
      actualValues.proteinGeneral = await nutritionalValues.nth(4).textContent();
    }
    
    // Compare values
    for (const [key, expectedValue] of Object.entries(expectedValues)) {
      const actualValue = actualValues[key];
      if (String(actualValue) !== String(expectedValue)) {
        throw new Error(`Expected ${key} to be "${expectedValue}" but got "${actualValue}"`);
      }
    }
  }

  /**
   * Verify keyboard navigation works correctly
   * Assumes search results are already visible
   */
  async verifyKeyboardNavigation() {
    await this.focusSearchInput();
    
    if (!(await this.isResultsDropdownVisible())) {
      throw new Error('Search results should be visible for keyboard navigation test');
    }
    
    const resultsCount = await this.getResultsCount();
    if (resultsCount === 0) {
      throw new Error('Need search results to test keyboard navigation');
    }
    
    // Test arrow down navigation
    await this.page.keyboard.press('ArrowDown');
    let selectedResult = await this.getSelectedResult();
    if (!selectedResult) {
      throw new Error('First item should be selected after pressing ArrowDown');
    }
    
    // Test arrow up navigation
    if (resultsCount > 1) {
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('ArrowUp');
      const backToFirst = await this.getSelectedResult();
      if (backToFirst.text !== selectedResult.text) {
        throw new Error('Should return to first item after ArrowDown then ArrowUp');
      }
    }
    
    // Test Escape key
    await this.page.keyboard.press('Escape');
    const isVisible = await this.isResultsDropdownVisible();
    if (isVisible) {
      throw new Error('Search results should be hidden after pressing Escape');
    }
  }

  // Helper methods

  /**
   * Get the parent table row containing this food search component
   */
  async getParentRow() {
    // If we have specific meal and row context, use it
    if (this.mealId !== null && this.rowIndex !== null) {
      const mealSection = this.page.locator(`[data-meal-id="${this.mealId}"]`);
      const rows = mealSection.locator('tbody tr');
      return rows.nth(this.rowIndex);
    } else {
      // Fallback to finding the first visible search input and its parent row
      const searchInputs = this.page.locator(this.selectors.searchInput);
      const count = await searchInputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = searchInputs.nth(i);
        if (await input.isVisible()) {
          return input.locator('xpath=ancestor::tr[1]');
        }
      }
      
      throw new Error('Could not find parent row');
    }
  }

  /**
   * Close the search results dropdown
   */
  async closeResults() {
    await this.page.keyboard.press('Escape');
    await this.waitForResultsHidden();
  }

  /**
   * Perform a complete food search and selection workflow
   * @param {string} searchTerm - Text to search for
   * @param {string|number} foodSelector - Food name or index to select
   * @param {string|number} amount - Amount to set (optional)
   */
  async performFoodSelection(searchTerm, foodSelector, amount = null) {
    // Search for food
    await this.searchForFood(searchTerm);
    
    // Select food
    if (typeof foodSelector === 'number') {
      await this.selectFoodByIndex(foodSelector);
    } else {
      await this.selectFoodByName(foodSelector);
    }
    
    // Set amount if provided
    if (amount !== null) {
      await this.setFoodAmount(amount);
    }
    
    // Verify selection
    const expectedFoodName = typeof foodSelector === 'string' ? foodSelector : 
      (await this.getSearchResults())[foodSelector]?.text;
    
    if (expectedFoodName) {
      await this.verifyFoodSelection(expectedFoodName);
    }
  }

  /**
   * Get comprehensive food search component state
   */
  async getFoodSearchState() {
    const state = {
      searchValue: await this.getSearchValue(),
      isResultsVisible: await this.isResultsDropdownVisible(),
      resultsCount: await this.getResultsCount(),
      selectedFoodData: await this.getSelectedFoodData(),
      foodAmount: await this.getFoodAmount(),
      baseFoodAmount: await this.getBaseFoodAmount()
    };
    
    if (state.isResultsVisible) {
      state.searchResults = await this.getSearchResults();
      state.selectedResult = await this.getSelectedResult();
    }
    
    return state;
  }
}

module.exports = FoodSearchModal;