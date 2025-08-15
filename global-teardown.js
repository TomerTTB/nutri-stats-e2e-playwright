/**
 * Global test teardown - runs once after all tests
 */

const DatabaseManager = require('./utils/database-manager');

async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  const dbManager = new DatabaseManager();
  
  try {
    // Restore database from backup
    const backupPath = process.env.TEST_BACKUP_PATH;
    if (backupPath) {
      await dbManager.cleanupTestDatabase(backupPath);
    }
    
    console.log('✅ Global test teardown complete');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

module.exports = globalTeardown;