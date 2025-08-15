/**
 * Database Manager for Test Environment
 * Handles database backup, restore, and cleanup operations
 */

const fs = require('fs').promises;
const path = require('path');

class DatabaseManager {
  constructor() {
    this.backupDir = path.join(__dirname, '..', 'data', 'backups');
    this.originDbPath = process.env.ORIGIN_DB_PATH || path.join(__dirname, '..', 'data', 'origin', 'nutrition_app.db');
    this.testDbPath = process.env.TEST_DB_PATH || path.join(__dirname, '..', 'data', 'test-nutrition_app.db');
  }

  /**
   * Create backup directory if it doesn't exist
   */
  async ensureBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Create a backup of the current test database
   */
  async createBackup(backupName = null) {
    await this.ensureBackupDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = backupName || `backup-${timestamp}.db`;
    const backupPath = path.join(this.backupDir, backupFileName);
    
    try {
      // Copy the current test database to backup location
      await fs.copyFile(this.testDbPath, backupPath);
      console.log(`Test database backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Failed to create test database backup:', error);
      throw error;
    }
  }

  /**
   * Restore test database from backup
   */
  async restoreFromBackup(backupPath) {
    try {
      await fs.copyFile(backupPath, this.testDbPath);
      console.log(`Test database restored from: ${backupPath}`);
    } catch (error) {
      console.error('Failed to restore test database:', error);
      throw error;
    }
  }

  /**
   * Setup test database by copying from origin master
   */
  async setupTestDatabase() {
    try {
      // Check if origin database exists
      if (!(await this.fileExists(this.originDbPath))) {
        throw new Error(`Origin master database not found at: ${this.originDbPath}`);
      }
      
      // Create backup of current test database if it exists
      let backupPath = null;
      if (await this.fileExists(this.testDbPath)) {
        backupPath = await this.createBackup('pre-test-backup');
      }
      
      // Copy origin database to test location
      await fs.copyFile(this.originDbPath, this.testDbPath);
      console.log(`Test database created by copying from origin: ${this.originDbPath}`);
      console.log(`Test database location: ${this.testDbPath}`);
      
      return backupPath;
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  /**
   * Clean up test database by removing it
   */
  async cleanupTestDatabase(backupPath) {
    try {
      // Remove test database
      if (await this.fileExists(this.testDbPath)) {
        await fs.unlink(this.testDbPath);
        console.log('Test database removed');
      }
      
      console.log('Test database cleanup complete');
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset database to clean state (remove test data)
   */
  async resetToCleanState() {
    // This would contain SQL commands to clean up test data
    // For now, we'll implement a simple approach
    console.log('Resetting database to clean state...');
    
    // TODO: Implement actual database cleanup queries
    // Example:
    // - DELETE FROM users WHERE email LIKE '%test%'
    // - DELETE FROM meals WHERE user_id IN (test_user_ids)
    // - DELETE FROM foods WHERE source = 'test'
  }

  /**
   * Get list of available backups
   */
  async getAvailableBackups() {
    try {
      await this.ensureBackupDir();
      const files = await fs.readdir(this.backupDir);
      return files.filter(file => file.endsWith('.db')).sort().reverse();
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }
}

module.exports = DatabaseManager;