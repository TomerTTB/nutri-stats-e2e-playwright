#!/usr/bin/env node

/**
 * Configuration validation script
 * 
 * This script validates the authentication configuration and provides
 * helpful error messages and suggestions for fixing configuration issues.
 */

const { authConfig, AuthConfig } = require('../config/auth-config');

async function validateConfiguration() {
  console.log('🔍 Validating authentication configuration...\n');
  
  try {
    // Load and validate configuration
    const config = await authConfig.load();
    
    console.log('✅ Configuration validation successful!\n');
    
    // Display current configuration
    console.log('📋 Current Configuration:');
    console.log('========================');
    
    const configKeys = [
      'AUTH_STRATEGY',
      'BASE_URL', 
      'AUTH_STORAGE_PATH',
      'PERSIST_AUTH_STATE',
      'JWT_FALLBACK_LOGIN',
      'TOKEN_ENDPOINT',
      'TOKEN_EXPIRATION',
      'AUTH_MAX_RETRIES',
      'AUTH_RETRY_DELAY',
      'AUTH_BACKOFF_MULTIPLIER',
      'CLEANUP_ENABLED'
    ];
    
    for (const key of configKeys) {
      const value = config[key];
      const isDefault = !process.env[key];
      console.log(`${key}: ${value}${isDefault ? ' (default)' : ''}`);
    }
    
    console.log('\n🎯 Strategy-specific Information:');
    console.log('=================================');
    
    if (authConfig.isJWTAuth()) {
      console.log('🔐 JWT Authentication Strategy');
      console.log(`📁 Storage State Path: ${authConfig.getStorageStatePath()}`);
      console.log(`🔄 Retry Configuration:`, authConfig.getRetryConfig());
      console.log(`🔙 Fallback to Login: ${config.JWT_FALLBACK_LOGIN === 'true' ? 'Enabled' : 'Disabled'}`);
    } else {
      console.log('🖱️ Login Authentication Strategy (UI-based)');
      console.log('ℹ️ This strategy uses the existing login flow via UI automation');
    }
    
    console.log('\n✨ Configuration is valid and ready to use!');
    
  } catch (error) {
    console.error('❌ Configuration validation failed:\n');
    
    if (error.name === 'AuthConfigError') {
      console.error(`🔧 ${error.message}\n`);
      
      // Provide helpful suggestions
      console.log('💡 Suggestions:');
      console.log('===============');
      
      if (error.message.includes('AUTH_STRATEGY')) {
        console.log('• Set AUTH_STRATEGY to either "login" or "jwt"');
        console.log('  Example: AUTH_STRATEGY=jwt');
      }
      
      if (error.message.includes('BASE_URL')) {
        console.log('• Ensure BASE_URL is a valid URL format');
        console.log('  Example: BASE_URL=http://localhost:8080');
      }
      
      if (error.message.includes('AUTH_STORAGE_PATH')) {
        console.log('• Check that the storage path directory exists and is writable');
        console.log('• Use an absolute path if relative paths cause issues');
        console.log('  Example: AUTH_STORAGE_PATH=/tmp/.auth/user.json');
      }
      
      if (error.message.includes('positive number')) {
        console.log('• Ensure numeric values are positive numbers');
        console.log('  Example: TOKEN_EXPIRATION=3600, AUTH_MAX_RETRIES=3');
      }
      
      if (error.message.includes('true') || error.message.includes('false')) {
        console.log('• Boolean values must be exactly "true" or "false"');
        console.log('  Example: PERSIST_AUTH_STATE=true, JWT_FALLBACK_LOGIN=false');
      }
      
    } else {
      console.error(`🚨 Unexpected error: ${error.message}`);
    }
    
    console.log('\n📚 For more information, see: docs/AUTHENTICATION_CONFIG.md');
    process.exit(1);
  }
}

// Show help information
function showHelp() {
  console.log(`
🔧 Authentication Configuration Validator

Usage:
  node scripts/validate-config.js [options]

Options:
  --help, -h     Show this help message
  --docs         Show configuration documentation

Examples:
  # Validate current configuration
  node scripts/validate-config.js
  
  # Validate with specific environment
  AUTH_STRATEGY=jwt node scripts/validate-config.js
  
  # Show documentation
  node scripts/validate-config.js --docs
`);
}

// Show documentation
function showDocs() {
  console.log(AuthConfig.generateDocumentation());
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--docs')) {
    showDocs();
    return;
  }
  
  await validateConfiguration();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = { validateConfiguration };