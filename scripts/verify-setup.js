#!/usr/bin/env node

/**
 * Verification script to test database manager setup
 */

const DatabaseManager = require('../utils/database-manager');
const path = require('path');
const fs = require('fs').promises;

async function verifySetup() {
  console.log('🔍 Verifying database manager setup...\n');
  
  const dbManager = new DatabaseManager();
  
  try {
    // 1. Check if origin database exists
    console.log('1. Checking origin database...');
    const originExists = await dbManager.fileExists(dbManager.originDbPath);
    console.log(`   Origin DB path: ${dbManager.originDbPath}`);
    console.log(`   Origin DB exists: ${originExists ? '✅' : '❌'}`);
    
    if (!originExists) {
      console.log('   ⚠️  Please copy your nutrition_app.db to the origin directory first!');
      return false;
    }
    
    // 2. Check origin database size
    const originStats = await fs.stat(dbManager.originDbPath);
    console.log(`   Origin DB size: ${(originStats.size / 1024).toFixed(2)} KB`);
    
    // 3. Test database setup
    console.log('\n2. Testing database setup...');
    const backupPath = await dbManager.setupTestDatabase();
    console.log(`   Setup completed successfully`);
    console.log(`   Backup path: ${backupPath || 'None (fresh setup)'}`);
    
    // 4. Verify test database was created
    console.log('\n3. Verifying test database creation...');
    const testExists = await dbManager.fileExists(dbManager.testDbPath);
    console.log(`   Test DB path: ${dbManager.testDbPath}`);
    console.log(`   Test DB exists: ${testExists ? '✅' : '❌'}`);
    
    if (testExists) {
      const testStats = await fs.stat(dbManager.testDbPath);
      console.log(`   Test DB size: ${(testStats.size / 1024).toFixed(2)} KB`);
      console.log(`   Size match: ${originStats.size === testStats.size ? '✅' : '❌'}`);
    }
    
    // 5. Test cleanup
    console.log('\n4. Testing database cleanup...');
    await dbManager.cleanupTestDatabase();
    
    const testExistsAfterCleanup = await dbManager.fileExists(dbManager.testDbPath);
    console.log(`   Test DB removed: ${!testExistsAfterCleanup ? '✅' : '❌'}`);
    
    // 6. Verify origin is still intact
    console.log('\n5. Verifying origin database integrity...');
    const originStillExists = await dbManager.fileExists(dbManager.originDbPath);
    console.log(`   Origin DB still exists: ${originStillExists ? '✅' : '❌'}`);
    
    if (originStillExists) {
      const finalOriginStats = await fs.stat(dbManager.originDbPath);
      console.log(`   Origin DB size unchanged: ${originStats.size === finalOriginStats.size ? '✅' : '❌'}`);
    }
    
    console.log('\n🎉 Database manager verification complete!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    return false;
  }
}

// Run verification if called directly
if (require.main === module) {
  verifySetup().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = verifySetup;