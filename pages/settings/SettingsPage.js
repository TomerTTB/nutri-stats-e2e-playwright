/**
 * SettingsPage class for user settings management
 * Handles settings form interactions, preference saving and validation,
 * and settings persistence verification
 */

const BasePage = require('../base/BasePage');

class SettingsPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Page selectors
    this.selectors = {
      // Form and main container
      userSettingsForm: '#userSettingsForm',
      settingsContainer: '.settings-container',
      settingsCard: '.settings-card',
      
      // BMR and calorie display
      bmrValue: '#bmrValue',
      totalCalories: '#totalCalories',
      weeklyCalories: '#weeklyCalories',
      
      // Personal Information
      userNameInput: '#userNameInput',
      sexSelect: '#sex',
      ageInput: '#age',
      
      // Physical Measurements
      unitSystemSelect: '#unitSystem',
      weightInput: '#weight',
      heightInput: '#height',
      unitWeight: '.unit-weight',
      unitHeight: '.unit-height',
      
      // Activity & Goals
      activityLevelSelect: '#activityLevel',
      mealIntervalInput: '#mealInterval',
      
      // Save status
      saveStatus: '#saveStatus',
      saveStatusIcon: '#saveStatus i',
      saveStatusText: '#saveStatus span',
      
      // Section headers
      sectionTitles: '.settings-section-title',
      personalInfoSection: '.settings-section:has(.settings-section-title:contains("Personal Information"))',
      physicalMeasurementsSection: '.settings-section:has(.settings-section-title:contains("Physical Measurements"))',
      activityGoalsSection: '.settings-section:has(.settings-section-title:contains("Activity & Goals"))'
    };

    // Default values and validation rules
    this.validationRules = {
      age: { min: 1, max: 120 },
      weight: { min: 20, max: 300 },
      height: { min: 100, max: 250 },
      mealInterval: { min: 1, max: 6 }
    };

    this.activityLevels = {
      '1.2': 'Sedentary (little/no exercise)',
      '1.375': 'Light (1-3 days/week)',
      '1.55': 'Moderate (3-5 days/week)',
      '1.725': 'Heavy (6-7 days/week)',
      '1.9': 'Very heavy (2x/day)'
    };
  }

  /**
   * Navigate to settings page
   */
  async navigateToSettings() {
    await this.navigate('/settings.html');
    await this.waitForPageLoad();
    await this.waitForElement(this.selectors.userSettingsForm);
  }

  /**
   * Check if currently on settings page
   */
  async isOnSettingsPage() {
    const currentUrl = this.getCurrentUrl();
    return currentUrl.includes('settings.html');
  }

  /**
   * Wait for settings page to be fully loaded
   */
  async waitForSettingsPageLoad() {
    await this.waitForElement(this.selectors.userSettingsForm);
    await this.waitForElement(this.selectors.bmrValue);
    await this.waitForElement(this.selectors.saveStatus);
  }

  // Settings form interaction methods

  /**
   * Fill personal information
   * @param {Object} personalInfo - Personal information data
   */
  async fillPersonalInformation(personalInfo) {
    if (personalInfo.name) {
      await this.clearAndFill(this.selectors.userNameInput, personalInfo.name);
    }
    
    if (personalInfo.sex) {
      await this.selectOption(this.selectors.sexSelect, personalInfo.sex);
    }
    
    if (personalInfo.age) {
      await this.clearAndFill(this.selectors.ageInput, personalInfo.age.toString());
    }
  }

  /**
   * Fill physical measurements
   * @param {Object} measurements - Physical measurements data
   */
  async fillPhysicalMeasurements(measurements) {
    if (measurements.unitSystem) {
      await this.selectOption(this.selectors.unitSystemSelect, measurements.unitSystem);
      // Wait for unit conversion to complete
      await this.page.waitForTimeout(500);
    }
    
    if (measurements.weight) {
      await this.clearAndFill(this.selectors.weightInput, measurements.weight.toString());
    }
    
    if (measurements.height) {
      await this.clearAndFill(this.selectors.heightInput, measurements.height.toString());
    }
  }

  /**
   * Fill activity and goals
   * @param {Object} activityData - Activity and goals data
   */
  async fillActivityAndGoals(activityData) {
    if (activityData.activityLevel) {
      await this.selectOption(this.selectors.activityLevelSelect, activityData.activityLevel.toString());
    }
    
    if (activityData.mealInterval) {
      await this.clearAndFill(this.selectors.mealIntervalInput, activityData.mealInterval.toString());
    }
  }

  /**
   * Fill all settings
   * @param {Object} settingsData - Complete settings data
   */
  async fillAllSettings(settingsData) {
    if (settingsData.personalInfo) {
      await this.fillPersonalInformation(settingsData.personalInfo);
    }
    
    if (settingsData.measurements) {
      await this.fillPhysicalMeasurements(settingsData.measurements);
    }
    
    if (settingsData.activity) {
      await this.fillActivityAndGoals(settingsData.activity);
    }
    
    // Wait for calculations to update
    await this.page.waitForTimeout(1000);
  }

  // Data retrieval methods

  /**
   * Get personal information values
   */
  async getPersonalInformation() {
    return {
      name: await this.page.inputValue(this.selectors.userNameInput),
      sex: await this.page.inputValue(this.selectors.sexSelect),
      age: await this.page.inputValue(this.selectors.ageInput)
    };
  }

  /**
   * Get physical measurements values
   */
  async getPhysicalMeasurements() {
    return {
      unitSystem: await this.page.inputValue(this.selectors.unitSystemSelect),
      weight: await this.page.inputValue(this.selectors.weightInput),
      height: await this.page.inputValue(this.selectors.heightInput),
      weightUnit: await this.getElementText(this.selectors.unitWeight),
      heightUnit: await this.getElementText(this.selectors.unitHeight)
    };
  }

  /**
   * Get activity and goals values
   */
  async getActivityAndGoals() {
    return {
      activityLevel: await this.page.inputValue(this.selectors.activityLevelSelect),
      mealInterval: await this.page.inputValue(this.selectors.mealIntervalInput)
    };
  }

  /**
   * Get all settings values
   */
  async getAllSettings() {
    return {
      personalInfo: await this.getPersonalInformation(),
      measurements: await this.getPhysicalMeasurements(),
      activity: await this.getActivityAndGoals(),
      calculations: await this.getCalculatedValues()
    };
  }

  /**
   * Get calculated BMR and calorie values
   */
  async getCalculatedValues() {
    return {
      bmr: await this.getElementText(this.selectors.bmrValue),
      totalCalories: await this.getElementText(this.selectors.totalCalories),
      weeklyCalories: await this.getElementText(this.selectors.weeklyCalories)
    };
  }

  // Unit system and conversion methods

  /**
   * Switch unit system
   * @param {string} unitSystem - 'metric' or 'imperial'
   */
  async switchUnitSystem(unitSystem) {
    await this.selectOption(this.selectors.unitSystemSelect, unitSystem);
    
    // Wait for unit conversion and label updates
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get current unit system
   */
  async getCurrentUnitSystem() {
    return await this.page.inputValue(this.selectors.unitSystemSelect);
  }

  /**
   * Verify unit labels are correct
   * @param {string} expectedUnitSystem - Expected unit system
   */
  async verifyUnitLabels(expectedUnitSystem) {
    const weightUnit = await this.getElementText(this.selectors.unitWeight);
    const heightUnit = await this.getElementText(this.selectors.unitHeight);
    
    if (expectedUnitSystem === 'metric') {
      if (weightUnit !== 'kg') {
        throw new Error(`Expected weight unit 'kg' but got '${weightUnit}'`);
      }
      if (heightUnit !== 'cm') {
        throw new Error(`Expected height unit 'cm' but got '${heightUnit}'`);
      }
    } else if (expectedUnitSystem === 'imperial') {
      if (weightUnit !== 'lb') {
        throw new Error(`Expected weight unit 'lb' but got '${weightUnit}'`);
      }
      if (heightUnit !== 'in') {
        throw new Error(`Expected height unit 'in' but got '${heightUnit}'`);
      }
    }
  }

  // Calculation verification methods

  /**
   * Calculate expected BMR
   * @param {Object} userData - User data for calculation
   */
  calculateExpectedBMR(userData) {
    const { weight, height, age, sex } = userData;
    
    if (sex === 'male') {
      return (13.397 * weight) + (4.799 * height) - (5.677 * age) + 88.362;
    } else {
      return (9.247 * weight) + (3.098 * height) - (4.330 * age) + 447.593;
    }
  }

  /**
   * Verify BMR calculation is correct
   * @param {Object} userData - User data for verification
   */
  async verifyBMRCalculation(userData) {
    const expectedBMR = this.calculateExpectedBMR(userData);
    const actualBMR = parseFloat(await this.getElementText(this.selectors.bmrValue));
    
    // Allow for small rounding differences
    if (Math.abs(actualBMR - expectedBMR) > 1) {
      throw new Error(`BMR calculation mismatch: expected ${Math.round(expectedBMR)}, got ${actualBMR}`);
    }
  }

  /**
   * Verify total calorie calculation
   * @param {Object} userData - User data including activity level
   */
  async verifyTotalCalorieCalculation(userData) {
    const expectedBMR = this.calculateExpectedBMR(userData);
    const expectedTotalCalories = expectedBMR * parseFloat(userData.activityLevel);
    const actualTotalCalories = parseFloat(await this.getElementText(this.selectors.totalCalories));
    
    if (Math.abs(actualTotalCalories - expectedTotalCalories) > 1) {
      throw new Error(`Total calories calculation mismatch: expected ${Math.round(expectedTotalCalories)}, got ${actualTotalCalories}`);
    }
  }

  /**
   * Verify weekly calorie calculation
   * @param {Object} userData - User data including activity level
   */
  async verifyWeeklyCalorieCalculation(userData) {
    const expectedBMR = this.calculateExpectedBMR(userData);
    const expectedTotalCalories = expectedBMR * parseFloat(userData.activityLevel);
    const expectedWeeklyCalories = expectedTotalCalories * 7;
    const actualWeeklyCalories = parseFloat(await this.getElementText(this.selectors.weeklyCalories));
    
    if (Math.abs(actualWeeklyCalories - expectedWeeklyCalories) > 7) {
      throw new Error(`Weekly calories calculation mismatch: expected ${Math.round(expectedWeeklyCalories)}, got ${actualWeeklyCalories}`);
    }
  }

  /**
   * Verify all calculations are correct
   * @param {Object} userData - Complete user data
   */
  async verifyAllCalculations(userData) {
    await this.verifyBMRCalculation(userData);
    await this.verifyTotalCalorieCalculation(userData);
    await this.verifyWeeklyCalorieCalculation(userData);
  }

  // Save status and persistence methods

  /**
   * Get current save status
   */
  async getSaveStatus() {
    const statusText = await this.getElementText(this.selectors.saveStatusText);
    const iconClass = await this.getElementAttribute(this.selectors.saveStatusIcon, 'class');
    
    return {
      text: statusText,
      iconClass: iconClass,
      isPending: statusText.includes('Saving') || iconClass.includes('text-warning'),
      isSaved: statusText.includes('saved') || iconClass.includes('text-success'),
      hasError: statusText.includes('Error') || iconClass.includes('text-danger')
    };
  }

  /**
   * Wait for settings to be saved
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForSettingsSaved(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const statusText = document.querySelector('#saveStatus span')?.textContent || '';
      return statusText.includes('saved');
    }, { timeout });
  }

  /**
   * Verify settings are saved
   */
  async verifySettingsSaved() {
    const saveStatus = await this.getSaveStatus();
    
    if (!saveStatus.isSaved) {
      throw new Error(`Settings should be saved but status is: ${saveStatus.text}`);
    }
  }

  /**
   * Trigger auto-save by changing a field
   * @param {string} fieldValue - Value to set in name field
   */
  async triggerAutoSave(fieldValue = 'Test User') {
    await this.clearAndFill(this.selectors.userNameInput, fieldValue);
    await this.page.keyboard.press('Tab'); // Trigger blur event
    await this.waitForSettingsSaved();
  }

  // Form validation methods

  /**
   * Test field validation
   * @param {string} fieldSelector - Field selector
   * @param {string} invalidValue - Invalid value to test
   * @param {string} validValue - Valid value to restore
   */
  async testFieldValidation(fieldSelector, invalidValue, validValue) {
    // Set invalid value
    await this.clearAndFill(fieldSelector, invalidValue);
    await this.page.keyboard.press('Tab');
    
    // Check if field shows validation error
    const field = this.page.locator(fieldSelector);
    const isValid = await field.evaluate(el => el.checkValidity());
    
    if (isValid) {
      throw new Error(`Field ${fieldSelector} should be invalid with value "${invalidValue}"`);
    }
    
    // Restore valid value
    await this.clearAndFill(fieldSelector, validValue);
    await this.page.keyboard.press('Tab');
  }

  /**
   * Test age validation
   */
  async testAgeValidation() {
    await this.testFieldValidation(this.selectors.ageInput, '0', '25');
    await this.testFieldValidation(this.selectors.ageInput, '150', '25');
  }

  /**
   * Test weight validation
   */
  async testWeightValidation() {
    await this.testFieldValidation(this.selectors.weightInput, '0', '70');
    await this.testFieldValidation(this.selectors.weightInput, '500', '70');
  }

  /**
   * Test height validation
   */
  async testHeightValidation() {
    await this.testFieldValidation(this.selectors.heightInput, '50', '175');
    await this.testFieldValidation(this.selectors.heightInput, '300', '175');
  }

  /**
   * Test meal interval validation
   */
  async testMealIntervalValidation() {
    await this.testFieldValidation(this.selectors.mealIntervalInput, '0', '3');
    await this.testFieldValidation(this.selectors.mealIntervalInput, '10', '3');
  }

  // Settings persistence verification

  /**
   * Save settings and reload page to verify persistence
   * @param {Object} settingsData - Settings data to save and verify
   */
  async testSettingsPersistence(settingsData) {
    // Fill and save settings
    await this.fillAllSettings(settingsData);
    await this.waitForSettingsSaved();
    
    // Reload page
    await this.reloadPage();
    await this.waitForSettingsPageLoad();
    
    // Verify settings were persisted
    const loadedSettings = await this.getAllSettings();
    
    // Compare key values
    if (settingsData.personalInfo?.name && loadedSettings.personalInfo.name !== settingsData.personalInfo.name) {
      throw new Error(`Name not persisted: expected "${settingsData.personalInfo.name}", got "${loadedSettings.personalInfo.name}"`);
    }
    
    if (settingsData.personalInfo?.age && loadedSettings.personalInfo.age !== settingsData.personalInfo.age.toString()) {
      throw new Error(`Age not persisted: expected "${settingsData.personalInfo.age}", got "${loadedSettings.personalInfo.age}"`);
    }
    
    if (settingsData.measurements?.weight && loadedSettings.measurements.weight !== settingsData.measurements.weight.toString()) {
      throw new Error(`Weight not persisted: expected "${settingsData.measurements.weight}", got "${loadedSettings.measurements.weight}"`);
    }
  }

  /**
   * Clear all settings
   */
  async clearAllSettings() {
    await this.clearAndFill(this.selectors.userNameInput, '');
    await this.clearAndFill(this.selectors.ageInput, '');
    await this.clearAndFill(this.selectors.weightInput, '');
    await this.clearAndFill(this.selectors.heightInput, '');
    await this.clearAndFill(this.selectors.mealIntervalInput, '');
  }

  /**
   * Set default settings
   */
  async setDefaultSettings() {
    const defaultSettings = {
      personalInfo: {
        name: 'Test User',
        sex: 'male',
        age: 30
      },
      measurements: {
        unitSystem: 'metric',
        weight: 70,
        height: 175
      },
      activity: {
        activityLevel: '1.55',
        mealInterval: 3
      }
    };
    
    await this.fillAllSettings(defaultSettings);
    return defaultSettings;
  }

  /**
   * Verify page loads correctly
   */
  async verifyPageLoaded() {
    await this.assertElementVisible(this.selectors.userSettingsForm);
    await this.assertElementVisible(this.selectors.bmrValue);
    await this.assertElementVisible(this.selectors.totalCalories);
    await this.assertElementVisible(this.selectors.weeklyCalories);
    
    // Verify form sections are present
    await this.assertElementVisible(this.selectors.userNameInput);
    await this.assertElementVisible(this.selectors.sexSelect);
    await this.assertElementVisible(this.selectors.ageInput);
    await this.assertElementVisible(this.selectors.weightInput);
    await this.assertElementVisible(this.selectors.heightInput);
    await this.assertElementVisible(this.selectors.activityLevelSelect);
    await this.assertElementVisible(this.selectors.mealIntervalInput);
    
    // Verify save status is visible
    await this.assertElementVisible(this.selectors.saveStatus);
  }

  /**
   * Test complete settings workflow
   */
  async testSettingsWorkflow() {
    // Set default settings
    const defaultSettings = await this.setDefaultSettings();
    
    // Wait for auto-save
    await this.waitForSettingsSaved();
    
    // Verify calculations
    await this.verifyAllCalculations({
      weight: defaultSettings.measurements.weight,
      height: defaultSettings.measurements.height,
      age: defaultSettings.personalInfo.age,
      sex: defaultSettings.personalInfo.sex,
      activityLevel: defaultSettings.activity.activityLevel
    });
    
    // Test unit system switching
    await this.switchUnitSystem('imperial');
    await this.verifyUnitLabels('imperial');
    
    await this.switchUnitSystem('metric');
    await this.verifyUnitLabels('metric');
    
    // Test persistence
    await this.testSettingsPersistence(defaultSettings);
    
    console.log('Settings workflow test completed successfully');
  }
}

module.exports = SettingsPage;