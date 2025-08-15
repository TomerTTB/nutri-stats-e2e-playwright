/**
 * FoodsPage class for food database management
 * Handles CRUD operations for food items, search and filter functionality,
 * and inline editing interaction methods
 */

const BasePage = require('../base/BasePage');

class FoodsPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Page selectors
    this.selectors = {
      // Add food form
      addFoodForm: '#addFoodForm',
      itemInput: '#item',
      amountInput: '#amount',
      caloriesInput: '#calories',
      carbsInput: '#carbs',
      proteinInput: '#protein',
      proteinGeneralInput: '#proteinGeneral',
      fatInput: '#fat',
      addFoodButton: '#addFoodForm button[type="submit"]',
      
      // Edit food modal
      editFoodModal: '#editFoodModal',
      editFoodForm: '#editFoodForm',
      editIndexInput: '#editIndex',
      editItemInput: '#editItem',
      editAmountInput: '#editAmount',
      editCaloriesInput: '#editCalories',
      editCarbsInput: '#editCarbs',
      editProteinInput: '#editProtein',
      editProteinGeneralInput: '#editProteinGeneral',
      editFatInput: '#editFat',
      saveEditButton: '#saveEdit',
      closeModalButton: '.btn-close',
      cancelModalButton: '.btn-secondary',
      
      // Search functionality
      searchInput: '#searchFood',
      searchIcon: '.bi-search',
      
      // Foods table
      foodsTable: '.table',
      foodsTableBody: '#foodsTableBody',
      tableRows: '#foodsTableBody tr',
      tableHeaders: 'thead th',
      
      // Table columns (0-based index)
      itemColumn: 'td:nth-child(1)',
      amountColumn: 'td:nth-child(2)',
      caloriesColumn: 'td:nth-child(3)',
      carbsColumn: 'td:nth-child(4)',
      proteinColumn: 'td:nth-child(5)',
      proteinGColumn: 'td:nth-child(6)',
      fatColumn: 'td:nth-child(7)',
      actionsColumn: 'td:nth-child(8)',
      
      // Action buttons
      editButton: '.edit-btn',
      deleteButton: '.delete-btn',
      
      // Empty state
      noResultsRow: 'tr:has-text("No food items found")',
      
      // Unit labels
      unitLabels: '.unit-label'
    };
  }

  /**
   * Navigate to foods page
   */
  async navigateToFoods() {
    await this.navigate('/foods.html');
    await this.waitForPageLoad();
    await this.waitForElement(this.selectors.addFoodForm);
  }

  /**
   * Check if currently on foods page
   */
  async isOnFoodsPage() {
    const currentUrl = this.getCurrentUrl();
    return currentUrl.includes('foods.html');
  }

  /**
   * Wait for foods page to be fully loaded
   */
  async waitForFoodsPageLoad() {
    await this.waitForElement(this.selectors.addFoodForm);
    await this.waitForElement(this.selectors.foodsTableBody);
    await this.waitForElement(this.selectors.searchInput);
  }

  // CRUD operation methods for food items

  /**
   * Add a new food item
   * @param {Object} foodData - Food data object
   */
  async addFood(foodData) {
    await this.waitForElement(this.selectors.addFoodForm);
    
    // Fill form fields
    if (foodData.item) await this.fillInput(this.selectors.itemInput, foodData.item);
    if (foodData.amount) await this.fillInput(this.selectors.amountInput, foodData.amount.toString());
    if (foodData.calories) await this.fillInput(this.selectors.caloriesInput, foodData.calories.toString());
    if (foodData.carbs) await this.fillInput(this.selectors.carbsInput, foodData.carbs.toString());
    if (foodData.protein) await this.fillInput(this.selectors.proteinInput, foodData.protein.toString());
    if (foodData.proteinGeneral) await this.fillInput(this.selectors.proteinGeneralInput, foodData.proteinGeneral.toString());
    if (foodData.fat) await this.fillInput(this.selectors.fatInput, foodData.fat.toString());
    
    // Submit form
    await this.clickElement(this.selectors.addFoodButton);
    
    // Wait for form to be processed and table to update
    await this.page.waitForTimeout(2000);
    
    // Wait for network requests to complete
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Edit an existing food item using inline editing
   * @param {number} rowIndex - Row index (0-based)
   * @param {Object} foodData - Updated food data
   */
  async editFood(rowIndex, foodData) {
    const rows = this.page.locator(this.selectors.tableRows);
    const targetRow = rows.nth(rowIndex);
    
    // Click edit button for the specified row
    await this.clickEditButton(rowIndex);
    
    // Wait for inline edit mode to activate
    await this.page.waitForTimeout(500);
    
    // Fill inline edit fields
    const editInputs = targetRow.locator('.food-edit');
    
    if (foodData.item !== undefined) {
      await editInputs.nth(0).fill(foodData.item.toString());
    }
    if (foodData.amount !== undefined) {
      await editInputs.nth(1).fill(foodData.amount.toString());
    }
    if (foodData.calories !== undefined) {
      await editInputs.nth(2).fill(foodData.calories.toString());
    }
    if (foodData.carbs !== undefined) {
      await editInputs.nth(3).fill(foodData.carbs.toString());
    }
    if (foodData.protein !== undefined) {
      await editInputs.nth(4).fill(foodData.protein.toString());
    }
    if (foodData.proteinGeneral !== undefined) {
      await editInputs.nth(5).fill(foodData.proteinGeneral.toString());
    }
    if (foodData.fat !== undefined) {
      await editInputs.nth(6).fill(foodData.fat.toString());
    }
    
    // Click save button
    await targetRow.locator('.save-btn').click();
    
    // Wait for save to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Delete a food item
   * @param {number} rowIndex - Row index (0-based)
   */
  async deleteFood(rowIndex) {
    // Set up dialog handler before clicking delete
    this.page.once('dialog', async dialog => {
      console.log('Dialog appeared:', dialog.message());
      await dialog.accept();
    });
    
    // Click delete button for the specified row
    await this.clickDeleteButton(rowIndex);
    
    // Wait for deletion to be processed
    await this.page.waitForTimeout(2000);
  }

  /**
   * Click edit button for a specific row
   * @param {number} rowIndex - Row index (0-based)
   */
  async clickEditButton(rowIndex) {
    const rows = this.page.locator(this.selectors.tableRows);
    const targetRow = rows.nth(rowIndex);
    const editButton = targetRow.locator(this.selectors.editButton);
    await editButton.click();
  }

  /**
   * Click delete button for a specific row
   * @param {number} rowIndex - Row index (0-based)
   */
  async clickDeleteButton(rowIndex) {
    const rows = this.page.locator(this.selectors.tableRows);
    const targetRow = rows.nth(rowIndex);
    const deleteButton = targetRow.locator(this.selectors.deleteButton);
    
    // Wait for button to be visible and click it
    await deleteButton.waitFor({ state: 'visible' });
    await deleteButton.click();
  }

  // Search and filter functionality

  /**
   * Search for foods
   * @param {string} searchTerm - Search term
   */
  async searchFoods(searchTerm) {
    const searchValue = searchTerm || '';
    await this.clearAndFill(this.selectors.searchInput, searchValue);
    
    // Wait for search results to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.clearAndFill(this.selectors.searchInput, '');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current search term
   */
  async getCurrentSearchTerm() {
    return await this.page.inputValue(this.selectors.searchInput);
  }

  // Table data retrieval methods

  /**
   * Get number of food items in table
   */
  async getFoodCount() {
    const rows = this.page.locator(this.selectors.tableRows);
    const count = await rows.count();
    
    // Check if it's the "no results" row
    if (count === 1) {
      const firstRow = rows.first();
      const text = await firstRow.textContent();
      if (text.includes('No food items found')) {
        return 0;
      }
    }
    
    return count;
  }

  /**
   * Get food data from a specific row
   * @param {number} rowIndex - Row index (0-based)
   */
  async getFoodData(rowIndex) {
    const rows = this.page.locator(this.selectors.tableRows);
    const targetRow = rows.nth(rowIndex);
    
    return {
      item: await targetRow.locator(this.selectors.itemColumn + ' .food-value').textContent(),
      amount: await targetRow.locator(this.selectors.amountColumn + ' .food-value').textContent(),
      calories: await targetRow.locator(this.selectors.caloriesColumn + ' .food-value').textContent(),
      carbs: await targetRow.locator(this.selectors.carbsColumn + ' .food-value').textContent(),
      protein: await targetRow.locator(this.selectors.proteinColumn + ' .food-value').textContent(),
      proteinG: await targetRow.locator(this.selectors.proteinGColumn + ' .food-value').textContent(),
      fat: await targetRow.locator(this.selectors.fatColumn + ' .food-value').textContent()
    };
  }

  /**
   * Get all food data from table (simplified version)
   */
  async getAllFoodData() {
    const rows = this.page.locator(this.selectors.tableRows);
    const count = await rows.count();
    
    // Check if it's the "no results" row
    if (count === 1) {
      const firstRow = rows.first();
      const text = await firstRow.textContent();
      if (text.includes('No food items found')) {
        return [];
      }
    }
    
    const foods = [];
    // Only read the first 10 rows to avoid timeout
    const maxRows = Math.min(count, 10);
    
    for (let i = 0; i < maxRows; i++) {
      try {
        const foodData = await this.getFoodData(i);
        foods.push(foodData);
      } catch (error) {
        // Skip rows that can't be read
        console.log(`Skipping row ${i}: ${error.message}`);
      }
    }
    
    return foods;
  }

  /**
   * Check if food exists in table (simple version)
   * @param {string} foodName - Food name to search for
   */
  async foodExists(foodName) {
    // Use search to filter and then check if food appears
    await this.searchFoods(foodName);
    await this.page.waitForTimeout(500);
    
    const rows = this.page.locator(this.selectors.tableRows);
    const count = await rows.count();
    
    if (count === 0) {
      await this.clearSearch();
      return false;
    }
    
    // Check if first row contains our food name
    const firstRow = rows.first();
    const text = await firstRow.textContent();
    const exists = text.includes(foodName) && !text.includes('No food items found');
    
    await this.clearSearch();
    return exists;
  }

  /**
   * Find food by name (simplified)
   * @param {string} foodName - Food name to search for
   */
  async findFoodByName(foodName) {
    const exists = await this.foodExists(foodName);
    if (!exists) return null;
    
    // If it exists, get the first few foods to find it
    const foods = await this.getAllFoodData();
    return foods.find(food => food.item.toLowerCase().includes(foodName.toLowerCase()));
  }

  /**
   * Get row index by food name
   * @param {string} foodName - Food name to search for
   */
  async getRowIndexByFoodName(foodName) {
    const foods = await this.getAllFoodData();
    return foods.findIndex(food => food.item.toLowerCase().includes(foodName.toLowerCase()));
  }

  // Form validation and interaction methods

  /**
   * Get add food form values
   */
  async getAddFoodFormValues() {
    return {
      item: await this.page.inputValue(this.selectors.itemInput),
      amount: await this.page.inputValue(this.selectors.amountInput),
      calories: await this.page.inputValue(this.selectors.caloriesInput),
      carbs: await this.page.inputValue(this.selectors.carbsInput),
      protein: await this.page.inputValue(this.selectors.proteinInput),
      proteinGeneral: await this.page.inputValue(this.selectors.proteinGeneralInput),
      fat: await this.page.inputValue(this.selectors.fatInput)
    };
  }

  /**
   * Clear add food form
   */
  async clearAddFoodForm() {
    await this.clearAndFill(this.selectors.itemInput, '');
    await this.clearAndFill(this.selectors.amountInput, '');
    await this.clearAndFill(this.selectors.caloriesInput, '');
    await this.clearAndFill(this.selectors.carbsInput, '');
    await this.clearAndFill(this.selectors.proteinInput, '');
    await this.clearAndFill(this.selectors.proteinGeneralInput, '');
    await this.clearAndFill(this.selectors.fatInput, '');
  }

  /**
   * Get edit food form values
   */
  async getEditFoodFormValues() {
    return {
      item: await this.page.inputValue(this.selectors.editItemInput),
      amount: await this.page.inputValue(this.selectors.editAmountInput),
      calories: await this.page.inputValue(this.selectors.editCaloriesInput),
      carbs: await this.page.inputValue(this.selectors.editCarbsInput),
      protein: await this.page.inputValue(this.selectors.editProteinInput),
      proteinGeneral: await this.page.inputValue(this.selectors.editProteinGeneralInput),
      fat: await this.page.inputValue(this.selectors.editFatInput)
    };
  }

  /**
   * Check if edit modal is open
   */
  async isEditModalOpen() {
    return await this.isElementVisible(this.selectors.editFoodModal + '.show');
  }

  /**
   * Close edit modal
   */
  async closeEditModal() {
    if (await this.isEditModalOpen()) {
      await this.clickElement(this.selectors.closeModalButton);
      await this.waitForElementHidden(this.selectors.editFoodModal + '.show');
    }
  }

  /**
   * Cancel edit modal
   */
  async cancelEditModal() {
    if (await this.isEditModalOpen()) {
      await this.clickElement(this.selectors.cancelModalButton);
      await this.waitForElementHidden(this.selectors.editFoodModal + '.show');
    }
  }

  // Validation and verification methods

  /**
   * Verify food was added successfully
   * @param {Object} foodData - Expected food data
   */
  async verifyFoodAdded(foodData) {
    // Wait for table to update
    await this.page.waitForTimeout(1000);
    
    // Get all foods and find the one we're looking for
    const allFoods = await this.getAllFoodData();
    const foundFood = allFoods.find(food => food.item === foodData.item);
    
    if (!foundFood) {
      throw new Error(`Food "${foodData.item}" was not found in the table`);
    }
    
    // Verify key data matches
    if (foodData.calories !== undefined && foundFood.calories !== foodData.calories.toString()) {
      throw new Error(`Calories mismatch: expected ${foodData.calories}, got ${foundFood.calories}`);
    }
  }

  /**
   * Verify food was edited successfully
   * @param {string} originalName - Original food name
   * @param {Object} updatedData - Updated food data
   */
  async verifyFoodEdited(originalName, updatedData) {
    // Search for the updated food
    const searchName = updatedData.item || originalName;
    await this.searchFoods(searchName);
    
    const foundFood = await this.findFoodByName(searchName);
    if (!foundFood) {
      throw new Error(`Updated food "${searchName}" was not found in the table`);
    }
    
    // Verify the updated data
    Object.keys(updatedData).forEach(key => {
      if (updatedData[key] && foundFood[key] !== updatedData[key].toString()) {
        throw new Error(`${key} mismatch: expected ${updatedData[key]}, got ${foundFood[key]}`);
      }
    });
    
    await this.clearSearch();
  }

  /**
   * Verify food was deleted successfully
   * @param {string} foodName - Food name that should be deleted
   */
  async verifyFoodDeleted(foodName) {
    // Simple check - just verify the food no longer exists
    const foodExists = await this.foodExists(foodName);
    if (foodExists) {
      throw new Error(`Food "${foodName}" should have been deleted but was still found`);
    }
  }

  /**
   * Verify search functionality works
   * @param {string} searchTerm - Search term
   * @param {number} expectedCount - Expected number of results
   */
  async verifySearchResults(searchTerm, expectedCount) {
    await this.searchFoods(searchTerm);
    
    const actualCount = await this.getFoodCount();
    if (actualCount !== expectedCount) {
      throw new Error(`Search for "${searchTerm}" expected ${expectedCount} results but got ${actualCount}`);
    }
    
    // Verify all results contain the search term
    if (actualCount > 0) {
      const foods = await this.getAllFoodData();
      foods.forEach(food => {
        if (!food.item.toLowerCase().includes(searchTerm.toLowerCase())) {
          throw new Error(`Search result "${food.item}" does not contain search term "${searchTerm}"`);
        }
      });
    }
    
    await this.clearSearch();
  }

  /**
   * Verify table is sorted correctly
   * @param {string} column - Column to check sorting for
   * @param {string} order - 'asc' or 'desc'
   */
  async verifySorting(column, order = 'asc') {
    const foods = await this.getAllFoodData();
    
    if (foods.length < 2) return; // Can't verify sorting with less than 2 items
    
    for (let i = 0; i < foods.length - 1; i++) {
      const current = foods[i][column];
      const next = foods[i + 1][column];
      
      if (order === 'asc') {
        if (current > next) {
          throw new Error(`Table is not sorted ascending by ${column}: ${current} > ${next}`);
        }
      } else {
        if (current < next) {
          throw new Error(`Table is not sorted descending by ${column}: ${current} < ${next}`);
        }
      }
    }
  }

  /**
   * Check if table is empty
   */
  async isTableEmpty() {
    const foodCount = await this.getFoodCount();
    return foodCount === 0;
  }

  /**
   * Check if "no results" message is displayed
   */
  async isNoResultsMessageDisplayed() {
    // Check for various possible "no results" messages
    const possibleMessages = [
      'tr:has-text("No food items found")',
      'tr:has-text("No foods found")',
      'td:has-text("No food items found")',
      'td:has-text("No foods found")'
    ];
    
    for (const selector of possibleMessages) {
      if (await this.isElementVisible(selector)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Verify page loads correctly
   */
  async verifyPageLoaded() {
    await this.assertElementVisible(this.selectors.addFoodForm);
    await this.assertElementVisible(this.selectors.foodsTable);
    await this.assertElementVisible(this.selectors.searchInput);
    
    // Verify form fields are present
    await this.assertElementVisible(this.selectors.itemInput);
    await this.assertElementVisible(this.selectors.amountInput);
    await this.assertElementVisible(this.selectors.caloriesInput);
    await this.assertElementVisible(this.selectors.addFoodButton);
  }

  /**
   * Test complete CRUD workflow
   * @param {Object} foodData - Test food data
   */
  async testCRUDWorkflow(foodData) {
    // Create
    await this.addFood(foodData);
    await this.verifyFoodAdded(foodData);
    
    // Read (search)
    await this.verifySearchResults(foodData.item, 1);
    
    // Update
    const updatedData = { ...foodData, calories: (foodData.calories || 100) + 50 };
    const rowIndex = await this.getRowIndexByFoodName(foodData.item);
    await this.editFood(rowIndex, updatedData);
    await this.verifyFoodEdited(foodData.item, updatedData);
    
    // Delete
    const newRowIndex = await this.getRowIndexByFoodName(updatedData.item);
    await this.deleteFood(newRowIndex);
    await this.verifyFoodDeleted(updatedData.item);
  }
}

module.exports = FoodsPage;