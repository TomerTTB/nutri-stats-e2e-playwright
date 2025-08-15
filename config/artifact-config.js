/**
 * Artifact Management Configuration
 * 
 * This file contains configuration options for test artifact management.
 * These settings control how artifacts are cleaned up before test runs.
 */

module.exports = {
  // Global artifact cleanup settings
  cleanup: {
    // Enable/disable artifact cleanup before test runs
    enabled: process.env.CLEANUP_ARTIFACTS !== 'false', // Default: true
    
    // Cleanup mode: 'all', 'selective', 'old', 'disabled'
    mode: process.env.CLEANUP_MODE || 'all',
    
    // Age threshold for 'old' mode (in days)
    ageDays: parseInt(process.env.CLEANUP_AGE_DAYS) || 7,
    
    // Selective cleanup options (used when mode is 'selective')
    selective: {
      screenshots: process.env.CLEANUP_SCREENSHOTS !== 'false',
      videos: process.env.CLEANUP_VIDEOS !== 'false', 
      traces: process.env.CLEANUP_TRACES !== 'false',
      reports: process.env.CLEANUP_REPORTS !== 'false'
    }
  },
  
  // Artifact retention settings
  retention: {
    // Maximum number of artifacts to keep (0 = unlimited)
    maxFiles: {
      screenshots: parseInt(process.env.MAX_SCREENSHOTS) || 0,
      videos: parseInt(process.env.MAX_VIDEOS) || 0,
      traces: parseInt(process.env.MAX_TRACES) || 0,
      reports: parseInt(process.env.MAX_REPORTS) || 0
    },
    
    // Maximum total size in MB (0 = unlimited)
    maxSizeMB: {
      screenshots: parseInt(process.env.MAX_SCREENSHOTS_SIZE_MB) || 0,
      videos: parseInt(process.env.MAX_VIDEOS_SIZE_MB) || 0,
      traces: parseInt(process.env.MAX_TRACES_SIZE_MB) || 0,
      reports: parseInt(process.env.MAX_REPORTS_SIZE_MB) || 0
    }
  },
  
  // Logging settings
  logging: {
    // Enable verbose logging for artifact operations
    verbose: process.env.ARTIFACT_VERBOSE === 'true',
    
    // Log artifact statistics after cleanup
    showStats: process.env.SHOW_ARTIFACT_STATS !== 'false'
  }
};

/**
 * Get cleanup configuration with validation
 */
function getCleanupConfig() {
  const config = module.exports;
  
  // Validate cleanup mode
  const validModes = ['all', 'selective', 'old', 'disabled'];
  if (!validModes.includes(config.cleanup.mode)) {
    console.warn(`⚠️ Invalid cleanup mode '${config.cleanup.mode}', defaulting to 'all'`);
    config.cleanup.mode = 'all';
  }
  
  // Disable cleanup if mode is 'disabled'
  if (config.cleanup.mode === 'disabled') {
    config.cleanup.enabled = false;
  }
  
  return config;
}

/**
 * Print current configuration
 */
function printConfig() {
  const config = getCleanupConfig();
  
  console.log('\n🔧 Artifact Configuration:');
  console.log('==========================');
  console.log(`Cleanup Enabled: ${config.cleanup.enabled}`);
  console.log(`Cleanup Mode: ${config.cleanup.mode}`);
  
  if (config.cleanup.mode === 'old') {
    console.log(`Age Threshold: ${config.cleanup.ageDays} days`);
  }
  
  if (config.cleanup.mode === 'selective') {
    console.log('Selective Options:');
    console.log(`  Screenshots: ${config.cleanup.selective.screenshots}`);
    console.log(`  Videos: ${config.cleanup.selective.videos}`);
    console.log(`  Traces: ${config.cleanup.selective.traces}`);
    console.log(`  Reports: ${config.cleanup.selective.reports}`);
  }
  
  console.log(`Verbose Logging: ${config.logging.verbose}`);
  console.log(`Show Stats: ${config.logging.showStats}`);
  console.log('');
}

module.exports.getCleanupConfig = getCleanupConfig;
module.exports.printConfig = printConfig;