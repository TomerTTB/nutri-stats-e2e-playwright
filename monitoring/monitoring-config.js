/**
 * Performance Monitoring Configuration
 * Supports both local monitoring and DataDog integration
 */

const fs = require('fs');
const path = require('path');

/**
 * Securely retrieve DataDog API key from multiple sources
 * Priority: GitHub Secrets > Environment Variable > Local Secret File
 */
function getDataDogApiKey() {
    // 1. GitHub Secrets (available in CI/CD)
    if (process.env.DD_API_KEY_SECRET) {
        return process.env.DD_API_KEY_SECRET;
    }
    
    // 2. Standard environment variable (for local development)
    if (process.env.DD_API_KEY) {
        return process.env.DD_API_KEY;
    }
    
    // 3. Local secret file (git-ignored)
    const secretPaths = [
        path.join(__dirname, '../.secrets/datadog-api-key'),
        path.join(__dirname, '../.secrets/dd-api-key.txt'),
        path.join(process.env.HOME || process.env.USERPROFILE || '', '.datadog/api-key'),
        '/etc/datadog/api-key'
    ];
    
    for (const secretPath of secretPaths) {
        try {
            if (fs.existsSync(secretPath)) {
                const apiKey = fs.readFileSync(secretPath, 'utf8').trim();
                if (apiKey && apiKey.length > 10) { // Basic validation
                    console.log(`🔐 DataDog API key loaded from: ${secretPath}`);
                    return apiKey;
                }
            }
        } catch (error) {
            // Continue to next source
        }
    }
    
    // 4. Check for base64 encoded key (for additional security)
    if (process.env.DD_API_KEY_B64) {
        try {
            const decoded = Buffer.from(process.env.DD_API_KEY_B64, 'base64').toString('utf8');
            if (decoded && decoded.length > 10) {
                return decoded;
            }
        } catch (error) {
            console.warn('⚠️ Failed to decode base64 API key');
        }
    }
    
    return null;
}

const config = {
    // Monitoring backend selection
    backend: process.env.MONITORING_BACKEND || 'local', // 'local', 'datadog', or 'both'

    // Local monitoring settings
    local: {
        enabled: process.env.LOCAL_MONITORING !== 'false', // Default enabled
        interval: parseInt(process.env.MONITORING_INTERVAL) || 5000, // 5 seconds
        outputDir: './test-artifacts/performance'
    },

    // DataDog settings
    datadog: {
        enabled: process.env.DATADOG_ENABLED === 'true',
        apiKey: getDataDogApiKey(),
        site: process.env.DD_SITE || 'datadoghq.com',
        service: process.env.DD_SERVICE || 'e2e-tests',
        env: process.env.DD_ENV || 'test',
        version: process.env.DD_VERSION || '1.0.0',
        tags: process.env.DD_TAGS ? process.env.DD_TAGS.split(',') : [],

        // Agent configuration (for GitHub Actions service container)
        agent: {
            traceUrl: process.env.DD_TRACE_AGENT_URL || 'http://localhost:8126',
            statsdUrl: process.env.DD_DOGSTATSD_URL || 'udp://localhost:8125',
            enabled: !!(process.env.DD_TRACE_AGENT_URL || process.env.CI)
        },

        // CI Visibility configuration
        ciVisibility: {
            enabled: process.env.DD_CIVISIBILITY_ENABLED === 'true' || process.env.CI === 'true',
            agentless: process.env.DD_CIVISIBILITY_AGENTLESS_ENABLED === 'true'
        },

        // Custom metrics configuration
        metrics: {
            namespace: 'playwright',
            slowTestThreshold: parseInt(process.env.DD_SLOW_TEST_THRESHOLD) || 10000, // 10 seconds
            memoryThreshold: parseInt(process.env.DD_MEMORY_THRESHOLD) || 100 // 100MB
        }
    }
};

/**
 * Validate and normalize configuration
 */
function validateConfig() {
    // Validate backend selection
    const validBackends = ['local', 'datadog', 'both'];
    if (!validBackends.includes(config.backend)) {
        console.warn(`⚠️ Invalid MONITORING_BACKEND: ${config.backend}. Using 'local'.`);
        config.backend = 'local';
    }

    // Auto-enable DataDog if backend includes it
    if (config.backend === 'datadog' || config.backend === 'both') {
        config.datadog.enabled = true;
    }

    // Validate DataDog configuration
    if (config.datadog.enabled && !config.datadog.apiKey) {
        console.warn('⚠️ DataDog enabled but DD_API_KEY not provided. Falling back to local monitoring.');
        config.datadog.enabled = false;
        if (config.backend === 'datadog') {
            config.backend = 'local';
        }
    }

    // Ensure at least one monitoring method is enabled
    if (!config.local.enabled && !config.datadog.enabled) {
        console.warn('⚠️ All monitoring disabled. Enabling local monitoring.');
        config.local.enabled = true;
        config.backend = 'local';
    }

    return config;
}

/**
 * Get reporters based on configuration
 */
function getReporters() {
    const validatedConfig = validateConfig();
    const reporters = [];

    // Add local performance reporter
    if (validatedConfig.local.enabled) {
        reporters.push(['./monitoring/performance-reporter.js']);
    }

    // Add DataDog reporter
    if (validatedConfig.datadog.enabled) {
        reporters.push(['./monitoring/datadog-reporter.js']);
    }

    return reporters;
}

/**
 * Get monitoring summary for logging
 */
function getMonitoringSummary() {
    const validatedConfig = validateConfig();
    const summary = {
        backend: validatedConfig.backend,
        local: validatedConfig.local.enabled,
        datadog: validatedConfig.datadog.enabled
    };

    if (validatedConfig.datadog.enabled) {
        summary.datadogService = validatedConfig.datadog.service;
        summary.datadogEnv = validatedConfig.datadog.env;
    }

    return summary;
}

/**
 * Print configuration summary
 */
function printConfig() {
    const validatedConfig = validateConfig();

    console.log('📊 Performance Monitoring Configuration:');
    console.log('========================================');
    console.log(`Backend: ${validatedConfig.backend}`);
    console.log(`Local Monitoring: ${validatedConfig.local.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`DataDog Monitoring: ${validatedConfig.datadog.enabled ? '✅ Enabled' : '❌ Disabled'}`);

    if (validatedConfig.datadog.enabled) {
        console.log(`DataDog Service: ${validatedConfig.datadog.service}`);
        console.log(`DataDog Environment: ${validatedConfig.datadog.env}`);
        console.log(`DataDog Site: ${validatedConfig.datadog.site}`);
    }

    console.log('');
}

module.exports = {
    config: validateConfig(),
    getReporters,
    getMonitoringSummary,
    printConfig
};