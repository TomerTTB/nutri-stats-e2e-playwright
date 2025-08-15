/**
 * API helper functions for test setup and teardown
 */

const { request } = require('@playwright/test');

class ApiHelpers {
  constructor(baseURL = process.env.API_BASE_URL || 'http://localhost:8080') {
    this.baseURL = baseURL;
    this.authToken = null;
    this.requestContext = null;
  }

  /**
   * Initialize API request context
   */
  async init() {
    this.requestContext = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Cleanup API request context
   */
  async cleanup() {
    if (this.requestContext) {
      await this.requestContext.dispose();
    }
  }

  /**
   * Set authentication token
   * @param {string} token - JWT token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Get request headers with authentication
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  /**
   * Make authenticated API request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   */
  async makeRequest(method, endpoint, data = null) {
    if (!this.requestContext) {
      await this.init();
    }

    const options = {
      headers: this.getHeaders()
    };

    if (data) {
      options.data = data;
    }

    const response = await this.requestContext[method.toLowerCase()](endpoint, options);
    
    let responseData = null;
    try {
      responseData = await response.json();
    } catch (error) {
      // Response might not be JSON
      responseData = await response.text();
    }

    return {
      status: response.status(),
      data: responseData,
      headers: response.headers(),
      ok: response.ok()
    };
  }

  // Authentication API methods

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   */
  async registerUser(userData) {
    // Only send the fields that the API expects
    const registrationData = {
      email: userData.email,
      name: userData.name,
      password: userData.password,
      confirmPassword: userData.confirmPassword || userData.password
    };
    
    return await this.makeRequest('POST', '/api/auth/register', registrationData);
  }

  /**
   * Login user and set auth token
   * @param {Object} credentials - Login credentials
   */
  async loginUser(credentials) {
    const response = await this.makeRequest('POST', '/api/auth/login', credentials);
    
    if (response.ok && response.data.token) {
      this.setAuthToken(response.data.token);
    }
    
    return response;
  }

  /**
   * Logout current user
   */
  async logoutUser() {
    const response = await this.makeRequest('POST', '/api/auth/logout');
    this.authToken = null;
    return response;
  }

  /**
   * Delete user account
   * @param {string} userId - User ID to delete
   */
  async deleteUser(userId) {
    return await this.makeRequest('DELETE', `/api/users/${userId}`);
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    return await this.makeRequest('GET', '/api/auth/profile');
  }

  // Food API methods

  /**
   * Create a new food item
   * @param {Object} foodData - Food data
   */
  async createFood(foodData) {
    return await this.makeRequest('POST', '/api/foods', foodData);
  }

  /**
   * Get all foods for current user
   */
  async getFoods() {
    return await this.makeRequest('GET', '/api/foods');
  }

  /**
   * Get specific food by ID
   * @param {string} foodId - Food ID
   */
  async getFood(foodId) {
    return await this.makeRequest('GET', `/api/foods/${foodId}`);
  }

  /**
   * Update food item
   * @param {string} foodId - Food ID
   * @param {Object} foodData - Updated food data
   */
  async updateFood(foodId, foodData) {
    return await this.makeRequest('PUT', `/api/foods/${foodId}`, foodData);
  }

  /**
   * Delete food item
   * @param {string} foodId - Food ID
   */
  async deleteFood(foodId) {
    return await this.makeRequest('DELETE', `/api/foods/${foodId}`);
  }

  /**
   * Search foods
   * @param {string} query - Search query
   */
  async searchFoods(query) {
    return await this.makeRequest('GET', `/api/foods/search?q=${encodeURIComponent(query)}`);
  }

  // Meal API methods

  /**
   * Create a new meal entry
   * @param {Object} mealData - Meal data
   */
  async createMeal(mealData) {
    return await this.makeRequest('POST', '/api/meals', mealData);
  }

  /**
   * Get meals for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async getMealsByDate(date) {
    return await this.makeRequest('GET', `/api/meals?date=${date}`);
  }

  /**
   * Update meal entry
   * @param {string} mealId - Meal ID
   * @param {Object} mealData - Updated meal data
   */
  async updateMeal(mealId, mealData) {
    return await this.makeRequest('PUT', `/api/meals/${mealId}`, mealData);
  }

  /**
   * Delete meal entry
   * @param {string} mealId - Meal ID
   */
  async deleteMeal(mealId) {
    return await this.makeRequest('DELETE', `/api/meals/${mealId}`);
  }

  /**
   * Add food to meal
   * @param {string} mealId - Meal ID
   * @param {Object} foodData - Food data to add
   */
  async addFoodToMeal(mealId, foodData) {
    return await this.makeRequest('POST', `/api/meals/${mealId}/foods`, foodData);
  }

  /**
   * Remove food from meal
   * @param {string} mealId - Meal ID
   * @param {string} foodId - Food ID to remove
   */
  async removeFoodFromMeal(mealId, foodId) {
    return await this.makeRequest('DELETE', `/api/meals/${mealId}/foods/${foodId}`);
  }

  // Weight API methods

  /**
   * Create weight entry
   * @param {Object} weightData - Weight data
   */
  async createWeightEntry(weightData) {
    return await this.makeRequest('POST', '/api/weight', weightData);
  }

  /**
   * Get weight entries
   * @param {string} startDate - Start date (optional)
   * @param {string} endDate - End date (optional)
   */
  async getWeightEntries(startDate = null, endDate = null) {
    let endpoint = '/api/weight';
    const params = [];
    
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * Update weight entry
   * @param {string} weightId - Weight entry ID
   * @param {Object} weightData - Updated weight data
   */
  async updateWeightEntry(weightId, weightData) {
    return await this.makeRequest('PUT', `/api/weight/${weightId}`, weightData);
  }

  /**
   * Delete weight entry
   * @param {string} weightId - Weight entry ID
   */
  async deleteWeightEntry(weightId) {
    return await this.makeRequest('DELETE', `/api/weight/${weightId}`);
  }

  // Settings API methods

  /**
   * Get user settings
   */
  async getSettings() {
    return await this.makeRequest('GET', '/api/settings');
  }

  /**
   * Update user settings
   * @param {Object} settingsData - Settings data
   */
  async updateSettings(settingsData) {
    return await this.makeRequest('PUT', '/api/settings', settingsData);
  }

  /**
   * Get nutrition goals
   */
  async getNutritionGoals() {
    return await this.makeRequest('GET', '/api/settings/goals');
  }

  /**
   * Update nutrition goals
   * @param {Object} goalsData - Goals data
   */
  async updateNutritionGoals(goalsData) {
    return await this.makeRequest('PUT', '/api/settings/goals', goalsData);
  }

  // Reports API methods

  /**
   * Get nutrition report
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   */
  async getNutritionReport(startDate, endDate) {
    return await this.makeRequest('GET', `/api/reports/nutrition?startDate=${startDate}&endDate=${endDate}`);
  }

  /**
   * Get weight progress report
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   */
  async getWeightReport(startDate, endDate) {
    return await this.makeRequest('GET', `/api/reports/weight?startDate=${startDate}&endDate=${endDate}`);
  }

  // Bulk operations for test setup/teardown

  /**
   * Create multiple food items
   * @param {Array} foodsData - Array of food data
   */
  async createMultipleFoods(foodsData) {
    const results = [];
    for (const foodData of foodsData) {
      const result = await this.createFood(foodData);
      results.push(result);
    }
    return results;
  }

  /**
   * Create multiple meal entries
   * @param {Array} mealsData - Array of meal data
   */
  async createMultipleMeals(mealsData) {
    const results = [];
    for (const mealData of mealsData) {
      const result = await this.createMeal(mealData);
      results.push(result);
    }
    return results;
  }

  /**
   * Create multiple weight entries
   * @param {Array} weightsData - Array of weight data
   */
  async createMultipleWeights(weightsData) {
    const results = [];
    for (const weightData of weightsData) {
      const result = await this.createWeightEntry(weightData);
      results.push(result);
    }
    return results;
  }

  /**
   * Clean up all test data for current user
   */
  async cleanupUserData() {
    const results = {
      foods: [],
      meals: [],
      weights: [],
      user: null
    };

    // Helper function to safely execute cleanup operations
    const safeCleanup = async (operation, name) => {
      try {
        return await operation();
      } catch (error) {
        if (process.env.DEBUG_CLEANUP === 'true') {
          console.warn(`Failed to cleanup ${name}:`, error.message);
        }
        return null;
      }
    };

    // Clean up foods
    await safeCleanup(async () => {
      const foodsResponse = await this.getFoods();
      if (foodsResponse.ok && foodsResponse.data && Array.isArray(foodsResponse.data)) {
        for (const food of foodsResponse.data) {
          const deleteResult = await this.deleteFood(food.id);
          results.foods.push(deleteResult);
        }
      }
    }, 'foods');

    // Clean up meals
    await safeCleanup(async () => {
      const today = new Date().toISOString().split('T')[0];
      const mealsResponse = await this.getMealsByDate(today);
      if (mealsResponse.ok && mealsResponse.data && Array.isArray(mealsResponse.data)) {
        for (const meal of mealsResponse.data) {
          const deleteResult = await this.deleteMeal(meal.id);
          results.meals.push(deleteResult);
        }
      }
    }, 'meals');

    // Clean up weight entries
    await safeCleanup(async () => {
      const weightsResponse = await this.getWeightEntries();
      if (weightsResponse.ok && weightsResponse.data && Array.isArray(weightsResponse.data)) {
        for (const weight of weightsResponse.data) {
          const deleteResult = await this.deleteWeightEntry(weight.id);
          results.weights.push(deleteResult);
        }
      }
    }, 'weights');

    // Clean up user account
    await safeCleanup(async () => {
      const userResponse = await this.getCurrentUser();
      if (userResponse.ok && userResponse.data) {
        const deleteUserResult = await this.deleteUser(userResponse.data.id);
        results.user = deleteUserResult;
      }
    }, 'user');

    return results;
  }

  /**
   * Setup test data for a user
   * @param {Object} testData - Test data object
   */
  async setupTestData(testData) {
    const results = {
      user: null,
      foods: [],
      meals: [],
      weights: [],
      goals: null
    };

    try {
      // Register user
      if (testData.user) {
        results.user = await this.registerUser(testData.user);
        
        // Login to get auth token
        if (results.user.ok) {
          await this.loginUser({
            username: testData.user.username,
            password: testData.user.password
          });
        }
      }

      // Create foods
      if (testData.foods) {
        results.foods = await this.createMultipleFoods(testData.foods);
      }

      // Create meals
      if (testData.meals) {
        results.meals = await this.createMultipleMeals(testData.meals);
      }

      // Create weight entries
      if (testData.weights) {
        results.weights = await this.createMultipleWeights(testData.weights);
      }

      // Set nutrition goals
      if (testData.goals) {
        results.goals = await this.updateNutritionGoals(testData.goals);
      }

    } catch (error) {
      console.error('Error during test data setup:', error);
      throw error;
    }

    return results;
  }

  /**
   * Wait for API response with retry
   * @param {Function} apiCall - API call function
   * @param {Function} condition - Condition to check response
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} delay - Delay between retries in ms
   */
  async waitForApiResponse(apiCall, condition, maxRetries = 5, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await apiCall();
        if (condition(response)) {
          return response;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`API condition not met after ${maxRetries} retries`);
  }
}

module.exports = ApiHelpers;