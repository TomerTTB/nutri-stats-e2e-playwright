const BaseComponent = require('../base/BaseComponent');
const FoodSearchModal = require('./FoodSearchModal');

/**
 * MealSection component class for individual meal management
 * Handles food addition/removal, meal total calculations, and meal state validation
 */
class MealSection extends BaseComponent {
  constructor(page, mealId) {
    const selector = `[data-meal-id="${mealId}"]`;
    super(page, selector, `MealSection-${mealId}`);
    
    this.mealId = mealId;
    
    // Meal section selectors
    this.selectors = {
      // Main containers
      mealSection: `[data-meal-id="${mealId}"]`,
      mealHeader: '.meal-header',
      mealTable: '.meal-table',
      mealTableBody: '.meal-table tbody',
      mealTableFoot: '.meal-table tfoot',
      
      // Header elements
      mealTitle: 'h3',
      mealTimeInput: '.meal-time',
      copyButton: '.copy-meal-btn',
      pasteButton: '.paste-meal-btn',
      
      // Table elements
      mealRows: '.meal-row',
      foodSearchInputs: '.food-search-input',
      amountInputs: '.amount-input',
      nutritionalValues: '.nutritional-value',
      
      // Total row elements
      totalRow: 'tfoot tr',
      totalCalories: '.total-calories',
      totalCarbs: '.total-carbs',
      totalProtein: '.total-protein',
      totalFat: '.total-fat',
      totalProteinG: '.total-protein-g',
      
      // Individual nutritional value columns (0-based index)
      caloriesColumn: 'td:nth-child(3)',
      carbsColumn: 'td:nth-child(4)',
      proteinColumn: 'td:nth-child(5)',
      fatColumn: 'td:nth-child(6)',
      proteinGColumn: 'td:nth-child(7)'
    };
  }

  // Food addition and removal methods

  /**
   * Add a food item to the meal
   * @param {string} foodName - Name of the food to add
   * @param {string|number} amount - Amount of the food
   * @param {number} rowIndex - Row index to add food to (optional, uses first empty row if not specified)
   */
  async addFood(foodName, amount, rowIndex = null) {
    const targetRowIndex = rowIndex !== null ? rowIndex : await this.getFirstEmptyRowIndex();
    
    if (targetRowIndex === -1) {
      throw new Error('No empty rows available to add food');
    }
    
    const row = await this.getMealRow(targetRowIndex);
    const foodSearchModal = new FoodSearchModal(this.page);
    
    // Set the food search modal context to this row
    foodSearchModal.selector = row.locator('.food-search-container').first();
    
    // Perform food selection
    await foodSearchModal.performFoodSelection(foodName, foodName, amount);
    
    // Wait for totals to update
    await this.waitForTotalsUpdate();
  }

  /**
   * Remove a food item from the meal
   * @param {number} rowIndex - Index of the row to remove food from
   */
  async removeFood(rowIndex) {
    const row = await this.getMealRow(rowIndex);
    const foodSearchInput = row.locator(this.selectors.foodSearchInputs);
    const amountInput = row.locator(this.selectors.amountInputs);
    
    // Clear the food search input and amount
    await foodSearchInput.fill('');
    await amountInput.fill('');
    
    // Wait for totals to update
    await this.waitForTotalsUpdate();
  }

  /**
   * Update the amount for a food item
   * @param {number} rowIndex - Index of the row to update
   * @param {string|number} newAmount - New amount value
   */
  async updateFoodAmount(rowIndex, newAmount) {
    const row = await this.getMealRow(rowIndex);
    const amountInput = row.locator(this.selectors.amountInputs);
    
    await amountInput.fill(String(newAmount));
    await amountInput.dispatchEvent('change');
    
    // Wait for totals to update
    await this.waitForTotalsUpdate();
  }

  /**
   * Get the first empty row index
   */
  async getFirstEmptyRowIndex() {
    const rows = await this.getMealRows();
    const rowCount = await rows.count();
    
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const foodInput = row.locator(this.selectors.foodSearchInputs);
      const value = await foodInput.inputValue();
      
      if (!value.trim()) {
        return i;
      }
    }
    
    return -1; // No empty rows found
  }

  /**
   * Get all food items in the meal
   */
  async getFoodItems() {
    const rows = await this.getMealRows();
    const rowCount = await rows.count();
    const foodItems = [];
    
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const foodInput = row.locator(this.selectors.foodSearchInputs);
      const amountInput = row.locator(this.selectors.amountInputs);
      const nutritionalValues = row.locator(this.selectors.nutritionalValues);
      
      const foodName = await foodInput.inputValue();
      
      if (foodName.trim()) {
        const amount = await amountInput.inputValue();
        const nutritionalCount = await nutritionalValues.count();
        
        const nutrition = {};
        if (nutritionalCount >= 5) {
          nutrition.calories = await nutritionalValues.nth(0).textContent();
          nutrition.carbs = await nutritionalValues.nth(1).textContent();
          nutrition.protein = await nutritionalValues.nth(2).textContent();
          nutrition.fat = await nutritionalValues.nth(3).textContent();
          nutrition.proteinG = await nutritionalValues.nth(4).textContent();
        }
        
        foodItems.push({
          rowIndex: i,
          name: foodName,
          amount: amount,
          nutrition: nutrition
        });
      }
    }
    
    return foodItems;
  }

  // Meal total calculation verification

  /**
   * Get meal totals from the footer row
   */
  async getMealTotals() {
    await this.waitForVisible();
    
    const totalCalories = await this.page.locator(`${this.selector} ${this.selectors.totalCalories}`).textContent();
    const totalCarbs = await this.page.locator(`${this.selector} ${this.selectors.totalCarbs}`).textContent();
    const totalProtein = await this.page.locator(`${this.selector} ${this.selectors.totalProtein}`).textContent();
    const totalFat = await this.page.locator(`${this.selector} ${this.selectors.totalFat}`).textContent();
    const totalProteinG = await this.page.locator(`${this.selector} ${this.selectors.totalProteinG}`).textContent();
    
    return {
      calories: parseFloat(totalCalories) || 0,
      carbs: parseFloat(totalCarbs) || 0,
      protein: parseFloat(totalProtein) || 0,
      fat: parseFloat(totalFat) || 0,
      proteinG: parseFloat(totalProteinG) || 0
    };
  }

  /**
   * Calculate expected totals based on food items
   */
  async calculateExpectedTotals() {
    const foodItems = await this.getFoodItems();
    const totals = {
      calories: 0,
      carbs: 0,
      protein: 0,
      fat: 0,
      proteinG: 0
    };
    
    for (const item of foodItems) {
      if (item.nutrition) {
        totals.calories += parseFloat(item.nutrition.calories) || 0;
        totals.carbs += parseFloat(item.nutrition.carbs) || 0;
        totals.protein += parseFloat(item.nutrition.protein) || 0;
        totals.fat += parseFloat(item.nutrition.fat) || 0;
        totals.proteinG += parseFloat(item.nutrition.proteinG) || 0;
      }
    }
    
    return totals;
  }

  /**
   * Verify meal totals are calculated correctly
   * @param {number} tolerance - Tolerance for floating point comparison (default: 0.1)
   */
  async verifyMealTotals(tolerance = 0.1) {
    const actualTotals = await this.getMealTotals();
    const expectedTotals = await this.calculateExpectedTotals();
    
    const differences = {};
    let hasErrors = false;
    
    for (const [key, expectedValue] of Object.entries(expectedTotals)) {
      const actualValue = actualTotals[key];
      const difference = Math.abs(actualValue - expectedValue);
      
      if (difference > tolerance) {
        differences[key] = {
          expected: expectedValue,
          actual: actualValue,
          difference: difference
        };
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      const errorMsg = `Meal ${this.mealId} totals verification failed:\n` +
        Object.entries(differences)
          .map(([key, diff]) => `${key}: expected ${diff.expected}, got ${diff.actual} (diff: ${diff.difference})`)
          .join('\n');
      throw new Error(errorMsg);
    }
  }

  /**
   * Wait for meal totals to update after changes
   * @param {number} timeout - Custom timeout (optional)
   */
  async waitForTotalsUpdate(timeout = 5000) {
    // Wait a short time for calculations to complete
    await this.page.waitForTimeout(500);
    
    // Verify totals are updated by checking if they're not all zero
    // (unless the meal is actually empty)
    const foodItems = await this.getFoodItems();
    const totals = await this.getMealTotals();
    
    if (foodItems.length > 0) {
      const totalSum = totals.calories + totals.carbs + totals.protein + totals.fat + totals.proteinG;
      if (totalSum === 0) {
        // Wait a bit more and check again
        await this.page.waitForTimeout(1000);
      }
    }
  }

  // Meal state validation utilities

  /**
   * Verify meal section is loaded and visible
   */
  async verifyMealSectionLoaded() {
    await this.assertVisible(`Meal ${this.mealId} section should be visible`);
    
    // Verify header elements
    const header = this.page.locator(`${this.selector} ${this.selectors.mealHeader}`);
    await header.waitFor({ state: 'visible' });
    
    const title = this.page.locator(`${this.selector} ${this.selectors.mealTitle}`);
    await title.waitFor({ state: 'visible' });
    
    const titleText = await title.textContent();
    if (!titleText.includes(`Meal ${this.mealId}`)) {
      throw new Error(`Expected meal title to contain "Meal ${this.mealId}" but got "${titleText}"`);
    }
    
    // Verify table structure
    const table = this.page.locator(`${this.selector} ${this.selectors.mealTable}`);
    await table.waitFor({ state: 'visible' });
    
    const tbody = this.page.locator(`${this.selector} ${this.selectors.mealTableBody}`);
    await tbody.waitFor({ state: 'visible' });
    
    const tfoot = this.page.locator(`${this.selector} ${this.selectors.mealTableFoot}`);
    await tfoot.waitFor({ state: 'visible' });
  }

  /**
   * Verify meal has expected number of rows
   * @param {number} expectedRowCount - Expected number of meal rows
   */
  async verifyMealRowCount(expectedRowCount) {
    const rows = await this.getMealRows();
    const actualCount = await rows.count();
    
    if (actualCount !== expectedRowCount) {
      throw new Error(`Expected ${expectedRowCount} meal rows but found ${actualCount}`);
    }
  }

  /**
   * Verify meal is empty (no food items)
   */
  async verifyMealEmpty() {
    const foodItems = await this.getFoodItems();
    
    if (foodItems.length > 0) {
      const foodNames = foodItems.map(item => item.name).join(', ');
      throw new Error(`Expected meal ${this.mealId} to be empty but found foods: ${foodNames}`);
    }
    
    const totals = await this.getMealTotals();
    const totalSum = totals.calories + totals.carbs + totals.protein + totals.fat + totals.proteinG;
    
    if (totalSum !== 0) {
      throw new Error(`Expected meal ${this.mealId} totals to be zero but got: ${JSON.stringify(totals)}`);
    }
  }

  /**
   * Verify meal contains specific food items
   * @param {Array} expectedFoods - Array of expected food objects with name and optionally amount
   */
  async verifyMealContainsFoods(expectedFoods) {
    const actualFoods = await this.getFoodItems();
    
    for (const expectedFood of expectedFoods) {
      const matchingFood = actualFoods.find(food => 
        food.name.toLowerCase().includes(expectedFood.name.toLowerCase())
      );
      
      if (!matchingFood) {
        const actualFoodNames = actualFoods.map(f => f.name).join(', ');
        throw new Error(`Expected food "${expectedFood.name}" not found in meal ${this.mealId}. Actual foods: ${actualFoodNames}`);
      }
      
      if (expectedFood.amount !== undefined) {
        const expectedAmount = String(expectedFood.amount);
        if (matchingFood.amount !== expectedAmount) {
          throw new Error(`Expected food "${expectedFood.name}" to have amount "${expectedAmount}" but got "${matchingFood.amount}"`);
        }
      }
    }
  }

  // Meal time management

  /**
   * Get the meal time
   */
  async getMealTime() {
    const timeInput = this.page.locator(`${this.selector} ${this.selectors.mealTimeInput}`);
    return await timeInput.inputValue();
  }

  /**
   * Set the meal time
   * @param {string} time - Time in HH:MM format
   */
  async setMealTime(time) {
    const timeInput = this.page.locator(`${this.selector} ${this.selectors.mealTimeInput}`);
    await timeInput.fill(time);
    await timeInput.dispatchEvent('change');
  }

  /**
   * Verify meal time
   * @param {string} expectedTime - Expected time in HH:MM format
   */
  async verifyMealTime(expectedTime) {
    const actualTime = await this.getMealTime();
    if (actualTime !== expectedTime) {
      throw new Error(`Expected meal ${this.mealId} time to be "${expectedTime}" but got "${actualTime}"`);
    }
  }

  // Copy/Paste functionality

  /**
   * Copy this meal
   */
  async copyMeal() {
    const copyButton = this.page.locator(`${this.selector} ${this.selectors.copyButton}`);
    await copyButton.click();
    
    // Wait for copy operation to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Paste meal data into this meal
   */
  async pasteMeal() {
    const pasteButton = this.page.locator(`${this.selector} ${this.selectors.pasteButton}`);
    
    // Verify paste button is enabled
    const isEnabled = await pasteButton.isEnabled();
    if (!isEnabled) {
      throw new Error(`Paste button for meal ${this.mealId} is not enabled - no meal data to paste`);
    }
    
    await pasteButton.click();
    
    // Wait for paste operation to complete
    await this.waitForTotalsUpdate();
  }

  /**
   * Verify copy button is visible and enabled
   */
  async verifyCopyButtonEnabled() {
    const copyButton = this.page.locator(`${this.selector} ${this.selectors.copyButton}`);
    await copyButton.waitFor({ state: 'visible' });
    
    const isEnabled = await copyButton.isEnabled();
    if (!isEnabled) {
      throw new Error(`Copy button for meal ${this.mealId} should be enabled`);
    }
  }

  /**
   * Verify paste button state
   * @param {boolean} shouldBeEnabled - Whether paste button should be enabled
   */
  async verifyPasteButtonState(shouldBeEnabled) {
    const pasteButton = this.page.locator(`${this.selector} ${this.selectors.pasteButton}`);
    await pasteButton.waitFor({ state: 'visible' });
    
    const isEnabled = await pasteButton.isEnabled();
    if (isEnabled !== shouldBeEnabled) {
      const expectedState = shouldBeEnabled ? 'enabled' : 'disabled';
      const actualState = isEnabled ? 'enabled' : 'disabled';
      throw new Error(`Paste button for meal ${this.mealId} should be ${expectedState} but is ${actualState}`);
    }
  }

  // Helper methods

  /**
   * Get all meal rows
   */
  async getMealRows() {
    return this.page.locator(`${this.selector} ${this.selectors.mealRows}`);
  }

  /**
   * Get a specific meal row by index
   * @param {number} index - Row index (0-based)
   */
  async getMealRow(index) {
    const rows = await this.getMealRows();
    return rows.nth(index);
  }

  /**
   * Get meal section state information
   */
  async getMealState() {
    await this.waitForVisible();
    
    const state = {
      mealId: this.mealId,
      isVisible: await this.isVisible(),
      mealTime: await this.getMealTime(),
      foodItems: await this.getFoodItems(),
      totals: await this.getMealTotals(),
      rowCount: await (await this.getMealRows()).count()
    };
    
    return state;
  }

  /**
   * Clear all food items from the meal
   */
  async clearMeal() {
    const foodItems = await this.getFoodItems();
    
    for (const item of foodItems) {
      await this.removeFood(item.rowIndex);
    }
    
    await this.verifyMealEmpty();
  }

  /**
   * Perform a complete meal setup with multiple foods
   * @param {Array} foods - Array of food objects with name, amount, and optionally nutrition
   */
  async setupMealWithFoods(foods) {
    // Clear existing meal first
    await this.clearMeal();
    
    // Add each food
    for (let i = 0; i < foods.length; i++) {
      const food = foods[i];
      await this.addFood(food.name, food.amount, i);
    }
    
    // Verify all foods were added
    await this.verifyMealContainsFoods(foods);
    
    // Verify totals are calculated
    await this.verifyMealTotals();
  }
}

module.exports = MealSection;