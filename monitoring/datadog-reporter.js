const fs = require('fs');
const path = require('path');

class DataDogReporter {
  constructor(options = {}) {
    this.config = this.loadConfig();
    this.testMetrics = [];
    this.suiteStartTime = null;
    this.ddClient = null;

    if (this.config.enabled) {
      this.initializeDataDog();
    }
  }

  loadConfig() {
    const config = {
      enabled: process.env.DATADOG_ENABLED === 'true',
      apiKey: process.env.DD_API_KEY,
      site: process.env.DD_SITE || 'datadoghq.com',
      service: process.env.DD_SERVICE || 'e2e-tests',
      env: process.env.DD_ENV || 'test',
      version: process.env.DD_VERSION || '1.0.0',
      tags: process.env.DD_TAGS ? process.env.DD_TAGS.split(',') : []
    };

    if (config.enabled && !config.apiKey) {
      console.warn('⚠️ DataDog enabled but DD_API_KEY not provided. Disabling DataDog reporting.');
      config.enabled = false;
    }

    return config;
  }

  initializeDataDog() {
    try {
      // Try to require datadog packages
      const tracer = require('dd-trace');
      const StatsD = require('hot-shots');

      // Initialize tracer with CI Visibility support
      tracer.init({
        service: this.config.service,
        env: this.config.env,
        version: this.config.version,
        tags: this.config.tags.reduce((acc, tag) => {
          const [key, value] = tag.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {}),
        // CI Visibility configuration
        ...(process.env.CI && {
          logInjection: true,
          runtimeMetrics: true,
          // Use agent URL if available (for GitHub Actions service container)
          url: process.env.DD_TRACE_AGENT_URL || 'http://localhost:8126'
        })
      });

      // Initialize StatsD client for custom metrics
      const statsdConfig = {
        globalTags: [
          `service:${this.config.service}`,
          `env:${this.config.env}`,
          `version:${this.config.version}`,
          ...this.config.tags
        ]
      };

      // Configure StatsD for different environments
      if (process.env.DD_DOGSTATSD_URL) {
        // Parse DD_DOGSTATSD_URL (e.g., "udp://localhost:8125")
        const url = new URL(process.env.DD_DOGSTATSD_URL);
        statsdConfig.host = url.hostname;
        statsdConfig.port = parseInt(url.port);
        statsdConfig.protocol = url.protocol.replace(':', '');
      } else {
        // Default configuration
        statsdConfig.host = 'localhost';
        statsdConfig.port = 8125;
      }

      this.ddClient = new StatsD(statsdConfig);

      console.log('🐕 DataDog monitoring initialized successfully');
      console.log(`📊 StatsD: ${statsdConfig.protocol || 'udp'}://${statsdConfig.host}:${statsdConfig.port}`);

      if (process.env.DD_TRACE_AGENT_URL) {
        console.log(`🔍 APM Traces: ${process.env.DD_TRACE_AGENT_URL}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize DataDog:', error.message);
      console.warn('💡 Install DataDog packages: npm install dd-trace hot-shots');
      this.config.enabled = false;
    }
  }

  onBegin(config, suite) {
    this.suiteStartTime = Date.now();
    this.totalTests = suite.allTests().length;

    if (this.config.enabled) {
      console.log('🐕 DataDog test suite monitoring started');

      // Send suite start metric
      this.ddClient?.increment('playwright.suite.started', 1, {
        total_tests: this.totalTests.toString(),
        workers: config.workers.toString()
      });
    }
  }

  onTestBegin(test) {
    test._ddStartTime = Date.now();
    test._ddStartMemory = process.memoryUsage();
  }

  onTestEnd(test, result) {
    const endTime = Date.now();
    const duration = result.duration;
    const endMemory = process.memoryUsage();

    const testMetric = {
      title: test.title,
      file: test.location.file,
      status: result.status,
      duration: duration,
      memory: {
        delta: Math.round((endMemory.rss - test._ddStartMemory.rss) / 1024 / 1024) // MB
      },
      retries: result.retry
    };

    this.testMetrics.push(testMetric);

    if (this.config.enabled && this.ddClient) {
      // Send test metrics to DataDog
      const tags = {
        test_file: path.basename(test.location.file),
        test_status: result.status,
        test_title: test.title.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
      };

      // Test duration metric
      this.ddClient.histogram('playwright.test.duration', duration, tags);

      // Memory usage metric
      this.ddClient.histogram('playwright.test.memory_delta', testMetric.memory.delta, tags);

      // Test result counter
      this.ddClient.increment(`playwright.test.${result.status}`, 1, tags);

      // Retry counter
      if (result.retry > 0) {
        this.ddClient.increment('playwright.test.retries', result.retry, tags);
      }

      // Log slow tests
      if (duration > 10000) {
        console.log(`🐕 DataDog: Slow test detected - ${test.title} (${duration}ms)`);
        this.ddClient.increment('playwright.test.slow', 1, tags);
      }
    }
  }

  onEnd(result) {
    const totalDuration = Date.now() - this.suiteStartTime;
    const passedTests = this.testMetrics.filter(t => t.status === 'passed').length;
    const failedTests = this.testMetrics.filter(t => t.status === 'failed').length;
    const skippedTests = this.testMetrics.filter(t => t.status === 'skipped').length;

    if (this.config.enabled && this.ddClient) {
      // Suite completion metrics
      this.ddClient.histogram('playwright.suite.duration', totalDuration);
      this.ddClient.gauge('playwright.suite.total_tests', this.totalTests);
      this.ddClient.gauge('playwright.suite.passed_tests', passedTests);
      this.ddClient.gauge('playwright.suite.failed_tests', failedTests);
      this.ddClient.gauge('playwright.suite.skipped_tests', skippedTests);

      // Pass rate metric
      const passRate = (passedTests / this.totalTests) * 100;
      this.ddClient.gauge('playwright.suite.pass_rate', passRate);

      // Performance insights
      const avgDuration = totalDuration / this.totalTests;
      this.ddClient.histogram('playwright.suite.avg_test_duration', avgDuration);

      // Get slowest and fastest tests
      const sortedByDuration = [...this.testMetrics].sort((a, b) => b.duration - a.duration);
      if (sortedByDuration.length > 0) {
        this.ddClient.histogram('playwright.suite.slowest_test', sortedByDuration[0].duration);
        this.ddClient.histogram('playwright.suite.fastest_test', sortedByDuration[sortedByDuration.length - 1].duration);
      }

      // Memory metrics
      const memoryDeltas = this.testMetrics.map(t => t.memory.delta);
      const avgMemoryDelta = memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length;
      const maxMemoryDelta = Math.max(...memoryDeltas);

      this.ddClient.histogram('playwright.suite.avg_memory_delta', avgMemoryDelta);
      this.ddClient.histogram('playwright.suite.max_memory_delta', maxMemoryDelta);

      console.log('🐕 DataDog metrics sent successfully');

      // Close DataDog client
      this.ddClient.close();
    }

    this.logSummary(totalDuration, passedTests, failedTests, skippedTests);
  }

  logSummary(totalDuration, passed, failed, skipped) {
    if (this.config.enabled) {
      console.log('\n🐕 DataDog Performance Summary:');
      console.log('================================');
      console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
      console.log(`✅ Passed: ${passed}/${this.totalTests}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`⏭️  Skipped: ${skipped}`);
      console.log(`📊 Metrics sent to DataDog (${this.config.site})`);
      console.log('');
    }
  }
}

module.exports = DataDogReporter;