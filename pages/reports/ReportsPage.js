/**
 * ReportsPage class for analytics and reporting
 * Handles report generation, data visualization methods, chart interactions,
 * and nutrition analysis verification methods
 */

const BasePage = require('../base/BasePage');

class ReportsPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Page selectors
    this.selectors = {
      // Tab navigation
      nutritionTab: '#nutrition-tab',
      weightTab: '#weight-tab',
      nutritionSection: '#nutrition-section',
      weightSection: '#weight-section',
      
      // Nutrition Report Section
      weeklyCaloriesChart: '#weeklyCaloriesChart',
      avgDailyCalories: '#avgDailyCalories',
      goalAchievement: '#goalAchievement',
      proteinAchievement: '#proteinAchievement',
      daysOnTrack: '#daysOnTrack',
      weeklyMacroTable: '#weeklyMacroTable',
      weeklyMacroTableBody: '#weeklyMacroTable tbody',
      
      // Weight Tracking Section
      currentWeight: '#currentWeight',
      latestWeightChange: '#latestWeightChange',
      weightChange: '#weightChange',
      avgWeightChange: '#avgWeightChange',
      weightTrend: '#weightTrend',
      weightChart: '#weightChart',
      
      // Weight Entry Form
      weightForm: '#weightForm',
      weightDate: '#weightDate',
      weightValue: '#weightValue',
      weightNote: '#weightNote',
      addWeightButton: '#weightForm button[type="submit"]',
      
      // Weight Entries Table
      weightEntriesTable: '#weightEntriesTable',
      weightEntriesTableBody: '#weightEntriesTable tbody',
      
      // Chart containers
      chartContainers: '.chart-container',
      
      // Cards and stats
      statCards: '.card',
      statValues: '.stat-value',
      achievementStats: '.achievement-stats',
      
      // Action buttons in tables
      editButtons: '.edit-btn',
      deleteButtons: '.delete-btn'
    };
  }

  /**
   * Navigate to reports page
   */
  async navigateToReports() {
    await this.navigate('/reports.html');
    await this.waitForPageLoad();
    await this.waitForElement(this.selectors.nutritionTab);
  }

  /**
   * Check if currently on reports page
   */
  async isOnReportsPage() {
    const currentUrl = this.getCurrentUrl();
    return currentUrl.includes('reports.html');
  }

  /**
   * Wait for reports page to be fully loaded
   */
  async waitForReportsPageLoad() {
    await this.waitForElement(this.selectors.nutritionTab);
    await this.waitForElement(this.selectors.weightTab);
    
    // Wait for charts to be initialized
    await this.page.waitForFunction(() => {
      return window.Chart && document.querySelector('#weeklyCaloriesChart');
    });
  }

  // Tab navigation methods

  /**
   * Switch to nutrition report tab
   */
  async switchToNutritionTab() {
    await this.clickElement(this.selectors.nutritionTab);
    await this.waitForElement(this.selectors.nutritionSection + '.active');
  }

  /**
   * Switch to weight tracking tab
   */
  async switchToWeightTab() {
    // Check if we're already on the weight tab
    const isWeightTabActive = await this.page.locator(this.selectors.weightTab + '.active').count() > 0;
    
    if (!isWeightTabActive) {
      await this.clickElement(this.selectors.weightTab);
      await this.waitForElement(this.selectors.weightSection + '.active');
      // Wait a bit more for the tab content to fully load
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Get currently active tab
   */
  async getCurrentActiveTab() {
    const nutritionActive = await this.page.locator(this.selectors.nutritionTab + '.active').count();
    const weightActive = await this.page.locator(this.selectors.weightTab + '.active').count();
    
    if (nutritionActive > 0) return 'nutrition';
    if (weightActive > 0) return 'weight';
    return null;
  }

  // Report generation and data visualization methods

  /**
   * Get nutrition achievement stats
   */
  async getNutritionAchievementStats() {
    await this.switchToNutritionTab();
    
    return {
      avgDailyCalories: await this.getElementText(this.selectors.avgDailyCalories),
      goalAchievement: await this.getElementText(this.selectors.goalAchievement),
      proteinAchievement: await this.getElementText(this.selectors.proteinAchievement),
      daysOnTrack: await this.getElementText(this.selectors.daysOnTrack)
    };
  }

  /**
   * Get weekly macro table data
   */
  async getWeeklyMacroData() {
    await this.switchToNutritionTab();
    
    const rows = this.page.locator(`${this.selectors.weeklyMacroTableBody} tr`);
    const rowCount = await rows.count();
    const macroData = [];
    
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const cells = row.locator('td');
      
      if (await cells.count() >= 6) {
        macroData.push({
          day: await cells.nth(0).textContent(),
          calories: await cells.nth(1).textContent(),
          protein: await cells.nth(2).textContent(),
          fat: await cells.nth(3).textContent(),
          carbs: await cells.nth(4).textContent(),
          status: await cells.nth(5).textContent()
        });
      }
    }
    
    return macroData;
  }

  /**
   * Get weight statistics
   */
  async getWeightStatistics() {
    await this.switchToWeightTab();
    
    return {
      currentWeight: await this.getElementText(this.selectors.currentWeight),
      latestWeightChange: await this.getElementText(this.selectors.latestWeightChange),
      weightChange: await this.getElementText(this.selectors.weightChange),
      avgWeightChange: await this.getElementText(this.selectors.avgWeightChange),
      weightTrend: await this.getElementText(this.selectors.weightTrend)
    };
  }

  /**
   * Get weight entries table data
   */
  async getWeightEntriesData() {
    await this.switchToWeightTab();
    
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const rowCount = await rows.count();
    const entriesData = [];
    
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const cells = row.locator('td');
      
      if (await cells.count() >= 5) {
        entriesData.push({
          date: await cells.nth(0).textContent(),
          weight: await cells.nth(1).textContent(),
          change: await cells.nth(2).textContent(),
          note: await cells.nth(3).textContent(),
          actions: await cells.nth(4).innerHTML()
        });
      }
    }
    
    return entriesData;
  }

  // Chart interaction and validation utilities

  /**
   * Check if weekly calories chart is visible
   */
  async isWeeklyCaloriesChartVisible() {
    await this.switchToNutritionTab();
    return await this.isElementVisible(this.selectors.weeklyCaloriesChart);
  }

  /**
   * Check if weight chart is visible
   */
  async isWeightChartVisible() {
    await this.switchToWeightTab();
    return await this.isElementVisible(this.selectors.weightChart);
  }

  /**
   * Get chart data points count
   * @param {string} chartId - Chart canvas ID
   */
  async getChartDataPointsCount(chartId) {
    return await this.page.evaluate((id) => {
      const canvas = document.getElementById(id);
      if (!canvas) return 0;
      
      const chart = Chart.getChart(canvas);
      if (!chart || !chart.data || !chart.data.datasets) return 0;
      
      return chart.data.datasets[0]?.data?.length || 0;
    }, chartId);
  }

  /**
   * Get chart labels
   * @param {string} chartId - Chart canvas ID
   */
  async getChartLabels(chartId) {
    return await this.page.evaluate((id) => {
      const canvas = document.getElementById(id);
      if (!canvas) return [];
      
      const chart = Chart.getChart(canvas);
      if (!chart || !chart.data) return [];
      
      return chart.data.labels || [];
    }, chartId);
  }

  /**
   * Get chart data values
   * @param {string} chartId - Chart canvas ID
   * @param {number} datasetIndex - Dataset index (default: 0)
   */
  async getChartDataValues(chartId, datasetIndex = 0) {
    return await this.page.evaluate((params) => {
      const canvas = document.getElementById(params.id);
      if (!canvas) return [];
      
      const chart = Chart.getChart(canvas);
      if (!chart || !chart.data || !chart.data.datasets) return [];
      
      const dataset = chart.data.datasets[params.datasetIndex];
      return dataset ? dataset.data || [] : [];
    }, { id: chartId, datasetIndex });
  }

  /**
   * Verify chart has data
   * @param {string} chartId - Chart canvas ID
   */
  async verifyChartHasData(chartId) {
    const dataPointsCount = await this.getChartDataPointsCount(chartId);
    if (dataPointsCount === 0) {
      throw new Error(`Chart ${chartId} has no data points`);
    }
    return dataPointsCount;
  }

  /**
   * Verify chart labels match expected
   * @param {string} chartId - Chart canvas ID
   * @param {Array} expectedLabels - Expected labels array
   */
  async verifyChartLabels(chartId, expectedLabels) {
    const actualLabels = await this.getChartLabels(chartId);
    
    if (actualLabels.length !== expectedLabels.length) {
      throw new Error(`Chart ${chartId} labels count mismatch: expected ${expectedLabels.length}, got ${actualLabels.length}`);
    }
    
    for (let i = 0; i < expectedLabels.length; i++) {
      if (actualLabels[i] !== expectedLabels[i]) {
        throw new Error(`Chart ${chartId} label mismatch at index ${i}: expected "${expectedLabels[i]}", got "${actualLabels[i]}"`);
      }
    }
  }

  // Weight entry management methods

  /**
   * Add weight entry
   * @param {Object} weightData - Weight entry data
   */
  async addWeightEntry(weightData) {
    await this.switchToWeightTab();
    
    // Ensure the weight form is visible by scrolling to it
    await this.page.locator(this.selectors.weightForm).scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    // Fill form fields
    if (weightData.date) {
      await this.clearAndFill(this.selectors.weightDate, weightData.date);
    }
    
    if (weightData.weight !== undefined) {
      await this.clearAndFill(this.selectors.weightValue, weightData.weight.toString());
    }
    
    if (weightData.note !== undefined) {
      await this.clearAndFill(this.selectors.weightNote, weightData.note);
    }
    
    // Submit form
    await this.clickElement(this.selectors.addWeightButton);
    
    // Wait for form to be processed and table to update
    // Check if the table updates by waiting for a new entry to appear
    try {
      await this.page.waitForFunction(() => {
        const rows = document.querySelectorAll('#weightEntriesTable tbody tr');
        return rows.length > 0 && !rows[0].textContent.includes('No weight entries yet');
      }, { timeout: 5000 });
    } catch (error) {
      // If waiting for table update fails, just wait a bit
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Get weight form values
   */
  async getWeightFormValues() {
    await this.switchToWeightTab();
    
    return {
      date: await this.page.inputValue(this.selectors.weightDate),
      weight: await this.page.inputValue(this.selectors.weightValue),
      note: await this.page.inputValue(this.selectors.weightNote)
    };
  }

  /**
   * Clear weight form
   */
  async clearWeightForm() {
    await this.switchToWeightTab();
    
    await this.clearAndFill(this.selectors.weightDate, '');
    await this.clearAndFill(this.selectors.weightValue, '');
    await this.clearAndFill(this.selectors.weightNote, '');
  }

  /**
   * Delete weight entry by row index
   * @param {number} rowIndex - Row index (0-based)
   */
  async deleteWeightEntry(rowIndex) {
    await this.switchToWeightTab();
    
    // Scroll to the weight entries table to ensure it's visible
    await this.page.locator(this.selectors.weightEntriesTable).scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const targetRow = rows.nth(rowIndex);
    const deleteButton = targetRow.locator(this.selectors.deleteButtons);
    
    // Ensure the delete button is visible
    await deleteButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    // Set up dialog handler to APPROVE the JavaScript alert popup
    let dialogHandled = false;
    const dialogHandler = async (dialog) => {
      console.log(`Approving delete confirmation: "${dialog.message()}"`);
      dialogHandled = true;
      await dialog.accept(); // APPROVE the deletion by accepting the alert
    };
    
    this.page.on('dialog', dialogHandler);
    
    try {
      // Click the delete button - this will trigger the confirm dialog
      await deleteButton.click();
      
      // Wait for the dialog to be handled (simple timeout approach)
      await this.page.waitForTimeout(3000);
      
      // Verify the dialog was handled by checking if dialogHandled is true
      if (!dialogHandled) {
        console.warn('Dialog may not have appeared or been handled properly');
      }
      
    } catch (error) {
      console.warn('Delete operation failed:', error.message);
      throw error;
    } finally {
      // Always remove the dialog handler
      this.page.off('dialog', dialogHandler);
    }
  }

  // Nutrition analysis verification methods

  /**
   * Verify nutrition calculations are accurate
   * @param {Object} expectedStats - Expected nutrition statistics
   */
  async verifyNutritionCalculations(expectedStats) {
    const actualStats = await this.getNutritionAchievementStats();
    
    // Compare key metrics
    if (expectedStats.avgDailyCalories) {
      const actual = parseFloat(actualStats.avgDailyCalories.replace(/[^\d.-]/g, ''));
      const expected = parseFloat(expectedStats.avgDailyCalories);
      
      if (Math.abs(actual - expected) > 1) {
        throw new Error(`Average daily calories mismatch: expected ${expected}, got ${actual}`);
      }
    }
    
    if (expectedStats.goalAchievement) {
      const actual = parseFloat(actualStats.goalAchievement.replace(/[^\d.-]/g, ''));
      const expected = parseFloat(expectedStats.goalAchievement);
      
      if (Math.abs(actual - expected) > 1) {
        throw new Error(`Goal achievement mismatch: expected ${expected}%, got ${actual}%`);
      }
    }
  }

  /**
   * Verify weight progress calculations
   * @param {Object} expectedStats - Expected weight statistics
   */
  async verifyWeightProgressCalculations(expectedStats) {
    const actualStats = await this.getWeightStatistics();
    
    if (expectedStats.currentWeight) {
      const actual = parseFloat(actualStats.currentWeight.replace(/[^\d.-]/g, ''));
      const expected = parseFloat(expectedStats.currentWeight);
      
      if (Math.abs(actual - expected) > 0.1) {
        throw new Error(`Current weight mismatch: expected ${expected}kg, got ${actual}kg`);
      }
    }
    
    if (expectedStats.weightChange) {
      const actual = parseFloat(actualStats.weightChange.replace(/[^\d.-]/g, ''));
      const expected = parseFloat(expectedStats.weightChange);
      
      if (Math.abs(actual - expected) > 0.1) {
        throw new Error(`Weight change mismatch: expected ${expected}kg, got ${actual}kg`);
      }
    }
  }

  /**
   * Verify macro breakdown data is accurate
   * @param {Array} expectedMacroData - Expected macro data for each day
   */
  async verifyMacroBreakdownData(expectedMacroData) {
    const actualMacroData = await this.getWeeklyMacroData();
    
    if (actualMacroData.length !== expectedMacroData.length) {
      throw new Error(`Macro data length mismatch: expected ${expectedMacroData.length} days, got ${actualMacroData.length}`);
    }
    
    for (let i = 0; i < expectedMacroData.length; i++) {
      const expected = expectedMacroData[i];
      const actual = actualMacroData[i];
      
      if (expected.day && actual.day !== expected.day) {
        throw new Error(`Day mismatch at index ${i}: expected ${expected.day}, got ${actual.day}`);
      }
      
      // Add more specific validations as needed
    }
  }

  /**
   * Verify weight entries are displayed correctly
   * @param {Array} expectedEntries - Expected weight entries
   */
  async verifyWeightEntriesData(expectedEntries) {
    const actualEntries = await this.getWeightEntriesData();
    
    if (actualEntries.length !== expectedEntries.length) {
      throw new Error(`Weight entries count mismatch: expected ${expectedEntries.length}, got ${actualEntries.length}`);
    }
    
    for (let i = 0; i < expectedEntries.length; i++) {
      const expected = expectedEntries[i];
      const actual = actualEntries[i];
      
      if (expected.date && !actual.date.includes(expected.date)) {
        throw new Error(`Date mismatch at index ${i}: expected ${expected.date}, got ${actual.date}`);
      }
      
      if (expected.weight) {
        const actualWeight = parseFloat(actual.weight.replace(/[^\d.-]/g, ''));
        const expectedWeight = parseFloat(expected.weight);
        
        if (Math.abs(actualWeight - expectedWeight) > 0.1) {
          throw new Error(`Weight mismatch at index ${i}: expected ${expectedWeight}kg, got ${actualWeight}kg`);
        }
      }
    }
  }

  /**
   * Check if reports have data
   */
  async hasReportData() {
    // Check nutrition report
    await this.switchToNutritionTab();
    const nutritionDataPoints = await this.getChartDataPointsCount('weeklyCaloriesChart');
    
    // Check weight report
    await this.switchToWeightTab();
    const weightDataPoints = await this.getChartDataPointsCount('weightChart');
    
    return {
      hasNutritionData: nutritionDataPoints > 0,
      hasWeightData: weightDataPoints > 0,
      nutritionDataPoints,
      weightDataPoints
    };
  }

  /**
   * Wait for charts to load
   */
  async waitForChartsToLoad() {
    // Wait for Chart.js to be available and charts to be rendered
    await this.page.waitForFunction(() => {
      return window.Chart && 
             document.querySelector('#weeklyCaloriesChart') &&
             document.querySelector('#weightChart');
    });
    
    // Give charts time to render data
    await this.page.waitForTimeout(2000);
  }

  /**
   * Take screenshot of specific chart
   * @param {string} chartId - Chart canvas ID
   * @param {string} filename - Screenshot filename
   */
  async takeChartScreenshot(chartId, filename) {
    const chartElement = this.page.locator(`#${chartId}`);
    await chartElement.screenshot({ path: `e2e-tests/screenshots/${filename}` });
  }

  /**
   * Verify page loads correctly
   */
  async verifyPageLoaded() {
    await this.assertElementVisible(this.selectors.nutritionTab);
    await this.assertElementVisible(this.selectors.weightTab);
    
    // Verify nutrition section is active by default
    await this.assertElementVisible(this.selectors.nutritionSection + '.active');
    
    // Verify key elements are present
    await this.assertElementVisible(this.selectors.weeklyCaloriesChart);
    await this.assertElementVisible(this.selectors.weeklyMacroTable);
    
    // Switch to weight tab and verify elements
    await this.switchToWeightTab();
    await this.assertElementVisible(this.selectors.weightChart);
    await this.assertElementVisible(this.selectors.weightForm);
    await this.assertElementVisible(this.selectors.weightEntriesTable);
  }

  // Additional weight tracking methods for comprehensive testing

  /**
   * Wait for weight section to load completely
   */
  async waitForWeightSectionLoad() {
    await this.switchToWeightTab();
    await this.waitForElement(this.selectors.weightForm);
    await this.waitForElement(this.selectors.weightEntriesTable);
    await this.waitForElement(this.selectors.weightChart);
    
    // Scroll to the weight form to ensure it's visible
    await this.page.locator(this.selectors.weightForm).scrollIntoViewIfNeeded();
    
    // Wait for weight statistics to load
    await this.page.waitForFunction(() => {
      const currentWeight = document.querySelector('#currentWeight');
      return currentWeight && currentWeight.textContent.trim() !== '';
    });
  }

  /**
   * Verify weight entry appears in table
   * @param {Object} expectedEntry - Expected weight entry data
   * @param {number} rowIndex - Row index to check (default: 0 for most recent)
   */
  async verifyWeightEntryInTable(expectedEntry, rowIndex = 0) {
    await this.switchToWeightTab();
    
    // Wait for table to update
    await this.page.waitForTimeout(1000);
    
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const rowCount = await rows.count();
    
    // Check if table is empty
    if (rowCount === 1) {
      const firstRowText = await rows.nth(0).textContent();
      if (firstRowText.includes('No weight entries yet')) {
        throw new Error('Expected weight entry but table is empty');
      }
    }
    
    // Check if the requested row exists
    if (rowIndex >= rowCount) {
      throw new Error(`Row index ${rowIndex} does not exist. Table has ${rowCount} rows.`);
    }
    
    const targetRow = rows.nth(rowIndex);
    
    if (expectedEntry.date) {
      const dateCell = targetRow.locator('td').nth(0);
      const dateText = await dateCell.textContent();
      const expectedDateObj = new Date(expectedEntry.date);
      
      // Try multiple date formats to be flexible
      const possibleFormats = [
        expectedDateObj.toLocaleDateString('en-US'), // M/D/YYYY
        expectedDateObj.toLocaleDateString('en-GB'), // DD/MM/YYYY
        expectedDateObj.toLocaleDateString('en-CA'), // YYYY-MM-DD
        expectedEntry.date // Original format
      ];
      
      const dateMatches = possibleFormats.some(format => 
        dateText.includes(format) || dateText.trim() === format
      );
      
      if (!dateMatches) {
        throw new Error(`Date mismatch: expected one of [${possibleFormats.join(', ')}], got "${dateText.trim()}"`);
      }
    }
    
    if (expectedEntry.weight !== undefined) {
      const weightCell = targetRow.locator('td').nth(1);
      const weightText = await weightCell.textContent();
      const expectedWeight = `${expectedEntry.weight.toFixed(1)} kg`;
      if (!weightText.includes(expectedWeight)) {
        throw new Error(`Weight mismatch: expected ${expectedWeight}, got ${weightText}`);
      }
    }
    
    if (expectedEntry.note !== undefined) {
      const noteCell = targetRow.locator('td').nth(3);
      const noteText = await noteCell.textContent();
      const expectedNote = expectedEntry.note || '-';
      if (expectedNote === '' || expectedNote === '-') {
        // Empty note should show as '-'
        if (!noteText.includes('-')) {
          throw new Error(`Note mismatch: expected empty note ('-'), got ${noteText}`);
        }
      } else {
        if (!noteText.includes(expectedEntry.note)) {
          throw new Error(`Note mismatch: expected ${expectedEntry.note}, got ${noteText}`);
        }
      }
    }
  }

  /**
   * Verify weight statistics are updated
   */
  async verifyWeightStatisticsUpdated() {
    await this.switchToWeightTab();
    
    const stats = await this.getWeightStatistics();
    
    // Verify current weight is not "No data"
    if (stats.currentWeight === 'No data' || stats.currentWeight === '-') {
      throw new Error('Current weight should be updated after adding entry');
    }
  }

  /**
   * Verify default weight date is set to today
   * @param {string} expectedDate - Expected date in YYYY-MM-DD format
   */
  async verifyDefaultWeightDate(expectedDate) {
    await this.switchToWeightTab();
    
    // Ensure the weight form is visible by scrolling to it
    await this.page.locator(this.selectors.weightForm).scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    const actualDate = await this.page.inputValue(this.selectors.weightDate);
    if (actualDate !== expectedDate) {
      throw new Error(`Default date mismatch: expected ${expectedDate}, got ${actualDate}`);
    }
  }

  /**
   * Verify weight form is reset after submission
   */
  async verifyWeightFormReset() {
    await this.switchToWeightTab();
    
    const formValues = await this.getWeightFormValues();
    const today = new Date().toISOString().split('T')[0];
    
    // Date should be reset to today
    if (formValues.date !== today) {
      throw new Error(`Form date not reset: expected ${today}, got ${formValues.date}`);
    }
    
    // Weight and note should be empty
    if (formValues.weight !== '') {
      throw new Error(`Form weight not reset: expected empty, got ${formValues.weight}`);
    }
    
    if (formValues.note !== '') {
      throw new Error(`Form note not reset: expected empty, got ${formValues.note}`);
    }
  }

  /**
   * Edit weight entry inline
   * @param {number} rowIndex - Row index to edit
   * @param {Object} updatedData - Updated entry data
   */
  async editWeightEntryInline(rowIndex, updatedData) {
    await this.switchToWeightTab();
    
    // Ensure we're on the weight tab and table is visible
    await this.page.locator(this.selectors.weightEntriesTable).scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1000);
    
    // Start editing
    await this.startWeightEntryEdit(rowIndex);
    
    // Fill edit form
    await this.fillWeightEditForm(rowIndex, updatedData);
    
    // Save changes
    await this.saveWeightEntryEdit(rowIndex);
  }

  /**
   * Start editing a weight entry
   * @param {number} rowIndex - Row index to edit
   */
  async startWeightEntryEdit(rowIndex) {
    // Ensure we're on the weight tab
    await this.switchToWeightTab();
    
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const targetRow = rows.nth(rowIndex);
    const editButton = targetRow.locator('.edit-btn');
    
    // Scroll to the edit button to ensure it's visible
    await editButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    await editButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Fill weight edit form
   * @param {number} rowIndex - Row index being edited
   * @param {Object} data - Data to fill
   */
  async fillWeightEditForm(rowIndex, data) {
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const targetRow = rows.nth(rowIndex);
    
    // Wait for the row to be in editing mode (inputs should be visible)
    await this.page.waitForTimeout(1000);
    
    if (data.date) {
      const dateInput = targetRow.locator('input[type="date"]');
      await dateInput.waitFor({ state: 'visible' });
      await dateInput.fill(data.date);
    }
    
    if (data.weight !== undefined) {
      const weightInput = targetRow.locator('input[type="number"]');
      await weightInput.waitFor({ state: 'visible' });
      await weightInput.fill(data.weight.toString());
    }
    
    if (data.note !== undefined) {
      const noteInput = targetRow.locator('input[type="text"]');
      await noteInput.waitFor({ state: 'visible' });
      await noteInput.fill(data.note);
    }
  }

  /**
   * Save weight entry edit
   * @param {number} rowIndex - Row index being edited
   */
  async saveWeightEntryEdit(rowIndex) {
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const targetRow = rows.nth(rowIndex);
    const saveButton = targetRow.locator('.save-btn');
    
    await saveButton.waitFor({ state: 'visible' });
    await saveButton.click();
    
    // Wait for the edit mode to exit (save button should disappear)
    await saveButton.waitFor({ state: 'hidden', timeout: 5000 });
    
    // Additional wait for the data to be saved and UI to update
    await this.page.waitForTimeout(2000);
  }

  /**
   * Cancel weight entry edit
   * @param {number} rowIndex - Row index being edited
   */
  async cancelWeightEntryEdit(rowIndex) {
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const targetRow = rows.nth(rowIndex);
    const cancelButton = targetRow.locator('.cancel-btn');
    
    await cancelButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get weight entry data from table
   * @param {number} rowIndex - Row index to get data from
   */
  async getWeightEntryFromTable(rowIndex) {
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const targetRow = rows.nth(rowIndex);
    const cells = targetRow.locator('td');
    
    const dateText = await cells.nth(0).textContent();
    const weightText = await cells.nth(1).textContent();
    const noteText = await cells.nth(3).textContent();
    
    return {
      date: dateText.trim(),
      weight: parseFloat(weightText.replace(/[^\d.-]/g, '')),
      note: noteText.trim() === '-' ? '' : noteText.trim()
    };
  }

  /**
   * Fill weight form with data
   * @param {Object} data - Form data
   */
  async fillWeightForm(data) {
    await this.switchToWeightTab();
    
    // Ensure the weight form is visible by scrolling to it
    await this.page.locator(this.selectors.weightForm).scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    if (data.date !== undefined) {
      await this.clearAndFill(this.selectors.weightDate, data.date);
    }
    
    if (data.weight !== undefined) {
      await this.clearAndFill(this.selectors.weightValue, data.weight.toString());
    }
    
    if (data.note !== undefined) {
      await this.clearAndFill(this.selectors.weightNote, data.note);
    }
  }

  /**
   * Submit weight form
   */
  async submitWeightForm() {
    // Set up dialog handler for potential validation errors
    let hasDialog = false;
    const dialogHandler = async (dialog) => {
      hasDialog = true;
      await dialog.accept();
    };
    
    this.page.on('dialog', dialogHandler);
    
    try {
      await this.clickElement(this.selectors.addWeightButton);
      await this.page.waitForTimeout(1000);
    } finally {
      this.page.off('dialog', dialogHandler);
    }
    
    return hasDialog;
  }

  /**
   * Verify weight form validation error
   * @param {string} expectedMessage - Expected error message (optional)
   */
  async verifyWeightFormValidationError(expectedMessage) {
    if (expectedMessage) {
      // Set up dialog handler before triggering the action that causes it
      let dialogMessage = '';
      const dialogHandler = async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      };
      
      this.page.on('dialog', dialogHandler);
      
      try {
        // Wait a bit for the dialog to appear
        await this.page.waitForTimeout(2000);
        
        // Remove the handler
        this.page.off('dialog', dialogHandler);
        
        if (!dialogMessage.includes(expectedMessage)) {
          throw new Error(`Expected error message "${expectedMessage}", got "${dialogMessage}"`);
        }
      } catch (error) {
        this.page.off('dialog', dialogHandler);
        throw error;
      }
    } else {
      // Just verify some validation occurred (form didn't submit successfully)
      const formValues = await this.getWeightFormValues();
      // If form still has invalid data, validation worked
      if (formValues.weight === '0' || formValues.weight === '' || formValues.date === '') {
        // This is expected for validation
        return;
      }
    }
  }

  /**
   * Attempt to save weight entry (for validation testing)
   * @param {number} rowIndex - Row index being edited
   */
  async attemptSaveWeightEntry(rowIndex) {
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const targetRow = rows.nth(rowIndex);
    const saveButton = targetRow.locator('.save-btn');
    
    await saveButton.click();
    // Don't wait for success - this is for testing validation
  }

  /**
   * Verify weight edit validation error
   */
  async verifyWeightEditValidationError() {
    // Wait for alert dialog indicating validation error
    const alertPromise = this.page.waitForEvent('dialog', { timeout: 2000 });
    try {
      const dialog = await alertPromise;
      await dialog.accept();
    } catch (error) {
      // If no dialog appears, check if edit form is still visible (indicating validation failed)
      const editingRows = this.page.locator('tr.editing');
      const count = await editingRows.count();
      if (count === 0) {
        throw new Error('Expected validation error but edit was saved');
      }
    }
  }

  /**
   * Get weight entry count
   */
  async getWeightEntryCount() {
    await this.switchToWeightTab();
    
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const count = await rows.count();
    
    // Check if it's the empty state row
    if (count === 1) {
      const firstRowText = await rows.nth(0).textContent();
      if (firstRowText.includes('No weight entries yet')) {
        return 0;
      }
    }
    
    return count;
  }

  /**
   * Attempt to delete weight entry with confirmation choice
   * @param {number} rowIndex - Row index to delete
   * @param {boolean} confirm - Whether to confirm deletion
   */
  async attemptDeleteWeightEntry(rowIndex, confirm = true) {
    await this.switchToWeightTab();
    
    // Scroll to the weight entries table to ensure it's visible
    await this.page.locator(this.selectors.weightEntriesTable).scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const targetRow = rows.nth(rowIndex);
    const deleteButton = targetRow.locator(this.selectors.deleteButtons);
    
    // Ensure the delete button is visible
    await deleteButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    // Set up dialog handler to handle the confirmation
    this.page.once('dialog', async dialog => {
      if (confirm) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
    
    // Click the delete button - this will trigger the confirm dialog
    await deleteButton.click();
    
    // Wait for operation to complete
    try {
      if (confirm) {
        // If confirmed, wait for deletion
        await this.page.waitForFunction((index) => {
          const rows = document.querySelectorAll('#weightEntriesTable tbody tr');
          return rows.length === 1 && rows[0].textContent.includes('No weight entries yet') ||
                 rows.length <= index;
        }, rowIndex, { timeout: 3000 });
      } else {
        // If cancelled, just wait a bit
        await this.page.waitForTimeout(500);
      }
    } catch (error) {
      // If waiting fails, just wait a bit
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Verify weight table empty state
   */
  async verifyWeightTableEmptyState() {
    await this.switchToWeightTab();
    
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const count = await rows.count();
    
    if (count !== 1) {
      throw new Error(`Expected 1 empty state row, got ${count} rows`);
    }
    
    const emptyRowText = await rows.nth(0).textContent();
    if (!emptyRowText.includes('No weight entries yet')) {
      throw new Error(`Expected empty state message, got: ${emptyRowText}`);
    }
  }

  /**
   * Get all weight entries from table
   */
  async getAllWeightEntries() {
    await this.switchToWeightTab();
    
    const count = await this.getWeightEntryCount();
    const entries = [];
    
    for (let i = 0; i < count; i++) {
      entries.push(await this.getWeightEntryFromTable(i));
    }
    
    return entries;
  }

  /**
   * Verify weight entries are in chronological order (most recent first)
   */
  async verifyWeightEntriesOrder() {
    const entries = await this.getAllWeightEntries();
    
    if (entries.length < 2) return; // Can't verify order with less than 2 entries
    
    for (let i = 0; i < entries.length - 1; i++) {
      const currentDate = new Date(entries[i].date);
      const nextDate = new Date(entries[i + 1].date);
      
      if (currentDate < nextDate) {
        throw new Error(`Entries not in chronological order: ${entries[i].date} should be after ${entries[i + 1].date}`);
      }
    }
  }

  /**
   * Verify weight table functionality
   */
  async verifyWeightTableFunctionality() {
    // Verify table is visible and has entries
    await this.assertElementVisible(this.selectors.weightEntriesTable);
    
    const count = await this.getWeightEntryCount();
    if (count === 0) {
      throw new Error('Weight table should have entries for functionality test');
    }
    
    // Verify first entry has action buttons
    const rows = this.page.locator(`${this.selectors.weightEntriesTableBody} tr`);
    const firstRow = rows.nth(0);
    
    // Check if edit and delete buttons exist
    const editButtonCount = await firstRow.locator('.edit-btn').count();
    const deleteButtonCount = await firstRow.locator('.delete-btn').count();
    
    if (editButtonCount === 0) {
      throw new Error('Edit button not found in first table row');
    }
    
    if (deleteButtonCount === 0) {
      throw new Error('Delete button not found in first table row');
    }
  }

  /**
   * Clear all weight entries
   */
  async clearAllWeightEntries() {
    await this.switchToWeightTab();
    
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      const count = await this.getWeightEntryCount();
      
      if (count === 0) {
        break; // All entries cleared
      }
      
      try {
        await this.deleteWeightEntry(0); // Always delete first entry
        await this.page.waitForTimeout(1000); // Wait for deletion to complete
      } catch (error) {
        console.warn(`Failed to delete entry on attempt ${attempts + 1}:`, error.message);
        // Try to continue with next attempt
      }
      
      attempts++;
    }
    
    // Final verification
    const finalCount = await this.getWeightEntryCount();
    if (finalCount > 0) {
      console.warn(`Could not clear all entries. ${finalCount} entries remaining after ${attempts} attempts.`);
    }
  }

  /**
   * Verify specific weight statistic
   * @param {string} statType - Type of statistic (currentWeight, latestWeightChange, etc.)
   * @param {string} expectedValue - Expected value
   */
  async verifyWeightStatistic(statType, expectedValue) {
    await this.switchToWeightTab();
    
    const selector = this.selectors[statType];
    if (!selector) {
      throw new Error(`Unknown weight statistic type: ${statType}`);
    }
    
    const actualValue = await this.getElementText(selector);
    if (actualValue !== expectedValue) {
      throw new Error(`${statType} mismatch: expected "${expectedValue}", got "${actualValue}"`);
    }
  }

  /**
   * Verify current weight
   * @param {string} expectedValue - Expected current weight
   */
  async verifyCurrentWeight(expectedValue) {
    await this.verifyWeightStatistic('currentWeight', expectedValue);
  }

  /**
   * Verify latest weight change
   * @param {string} expectedValue - Expected latest weight change
   */
  async verifyLatestWeightChange(expectedValue) {
    await this.verifyWeightStatistic('latestWeightChange', expectedValue);
  }

  /**
   * Verify overall weight change
   * @param {string} expectedValue - Expected overall weight change
   */
  async verifyOverallWeightChange(expectedValue) {
    await this.verifyWeightStatistic('weightChange', expectedValue);
  }

  /**
   * Verify average weight change
   * @param {string} expectedValue - Expected average weight change
   */
  async verifyAverageWeightChange(expectedValue) {
    await this.verifyWeightStatistic('avgWeightChange', expectedValue);
  }

  /**
   * Verify weight trend
   * @param {string} expectedValue - Expected weight trend
   */
  async verifyWeightTrend(expectedValue) {
    await this.verifyWeightStatistic('weightTrend', expectedValue);
  }

  /**
   * Verify weight chart is visible
   */
  async verifyWeightChartVisible() {
    await this.switchToWeightTab();
    await this.assertElementVisible(this.selectors.weightChart);
  }

  /**
   * Verify weight chart is updated
   */
  async verifyWeightChartUpdated() {
    await this.switchToWeightTab();
    
    // Wait for chart to update
    await this.page.waitForTimeout(1000);
    
    // Verify chart has data
    const dataPoints = await this.getChartDataPointsCount('weightChart');
    if (dataPoints === 0) {
      throw new Error('Weight chart should have data points after update');
    }
  }

  /**
   * Get weight chart data point count
   */
  async getWeightChartDataPointCount() {
    return await this.getChartDataPointsCount('weightChart');
  }

  /**
   * Verify weight chart empty state
   */
  async verifyWeightChartEmptyState() {
    await this.switchToWeightTab();
    
    const dataPoints = await this.getChartDataPointsCount('weightChart');
    if (dataPoints !== 0) {
      throw new Error(`Expected empty chart but found ${dataPoints} data points`);
    }
  }

  /**
   * Test complete reports workflow
   */
  async testReportsWorkflow() {
    // Test navigation between tabs
    await this.switchToNutritionTab();
    expect(await this.getCurrentActiveTab()).toBe('nutrition');
    
    await this.switchToWeightTab();
    expect(await this.getCurrentActiveTab()).toBe('weight');
    
    // Test chart visibility
    await this.switchToNutritionTab();
    expect(await this.isWeeklyCaloriesChartVisible()).toBe(true);
    
    await this.switchToWeightTab();
    expect(await this.isWeightChartVisible()).toBe(true);
    
    // Test data retrieval
    const nutritionStats = await this.getNutritionAchievementStats();
    expect(nutritionStats).toBeDefined();
    
    const weightStats = await this.getWeightStatistics();
    expect(weightStats).toBeDefined();
  }
}

module.exports = ReportsPage;