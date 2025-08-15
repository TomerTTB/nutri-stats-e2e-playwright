#!/usr/bin/env node

/**
 * Manual test data cleanup script
 * Run this script to clean up test data from the database
 */

const DatabaseManager = require('../utils/database-manager');

async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup...');
  
  const dbManager = new DatabaseManager();
  
  try {
    // Simply remove the test database
    await dbManager.cleanupTestDatabase();
    
    console.log('✅ Test data cleanup complete');
    
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupTestData();
}

module.exports = cleanupTestData;