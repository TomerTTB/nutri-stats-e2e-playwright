/**
 * Global test setup - runs once before all tests
 */

const DatabaseManager = require('./utils/database-manager');
const { cleanupArtifacts, createArtifactStructure, getArtifactStats } = require('./scripts/manage-artifacts');
const { getCleanupConfig, printConfig } = require('./config/artifact-config');
const PerformanceMonitor = require('./monitoring/performance-monitor');
const { config: monitoringConfig, printConfig: printMonitoringConfig } = require('./monitoring/monitoring-config');
const os = require('os');

async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Log system information
  console.log('💻 System Information:');
  console.log(`   OS: ${os.type()} ${os.release()}`);
  console.log(`   Architecture: ${os.arch()}`);
  console.log(`   CPU Cores: ${os.cpus().length}`);
  console.log(`   Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
  console.log(`   Free Memory: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`);
  console.log(`   Load Average: ${os.loadavg().map(l => l.toFixed(2)).join(', ')}`);
  console.log('');
  
  // Print monitoring configuration
  printMonitoringConfig();
  
  const dbManager = new DatabaseManager();
  
  try {
    // Clean up artifacts before test run if enabled
    await handleArtifactCleanup();
    
    // Create database backup before tests
    const backupPath = await dbManager.setupTestDatabase();
    
    // Store backup path for global teardown
    process.env.TEST_BACKUP_PATH = backupPath;
    
    // Initialize global performance monitor (only if local monitoring is enabled)
    if (monitoringConfig.local.enabled) {
      global.performanceMonitor = new PerformanceMonitor();
      
      // Start monitoring with configured interval
      await global.performanceMonitor.startMonitoring(monitoringConfig.local.interval);
      console.log('🔍 Local performance monitoring started');
    }
    
    console.log('✅ Global test setup complete');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}

/**
 * Handle artifact cleanup based on configuration
 */
async function handleArtifactCleanup() {
  const config = getCleanupConfig();
  
  if (!config.cleanup.enabled) {
    console.log('🔧 Artifact cleanup disabled');
    return;
  }
  
  // Print configuration if verbose logging is enabled
  if (config.logging.verbose) {
    printConfig();
  }
  
  console.log(`🧹 Cleaning up artifacts (mode: ${config.cleanup.mode})`);
  
  try {
    // Ensure artifact structure exists
    await createArtifactStructure();
    
    // Get stats before cleanup if enabled
    let statsBefore = null;
    if (config.logging.showStats) {
      statsBefore = await getArtifactStats();
    }
    
    switch (config.cleanup.mode) {
      case 'all':
        await cleanupArtifacts({ all: true });
        console.log('✅ All artifacts cleaned');
        break;
        
      case 'selective':
        await cleanupArtifacts(config.cleanup.selective);
        console.log('✅ Selective artifacts cleaned');
        break;
        
      case 'old':
        const olderThan = new Date(Date.now() - config.cleanup.ageDays * 24 * 60 * 60 * 1000);
        await cleanupArtifacts({ 
          all: false,
          screenshots: true,
          videos: true,
          traces: true,
          reports: true,
          olderThan 
        });
        console.log(`✅ Artifacts older than ${config.cleanup.ageDays} days cleaned`);
        break;
        
      default:
        console.warn(`⚠️ Unknown cleanup mode: ${config.cleanup.mode}, skipping cleanup`);
    }
    
    // Show stats after cleanup if enabled
    if (config.logging.showStats && statsBefore) {
      const statsAfter = await getArtifactStats();
      console.log(`📊 Cleanup Summary: ${statsBefore.total.count} → ${statsAfter.total.count} files`);
    }
    
  } catch (error) {
    console.warn('⚠️ Artifact cleanup failed:', error.message);
    // Don't fail the entire setup if cleanup fails
  }
}

module.exports = globalSetup;