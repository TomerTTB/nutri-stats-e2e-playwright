const fs = require('fs');
const path = require('path');

class PerformanceReporter {
  constructor(options = {}) {
    this.outputDir = path.join(__dirname, '../test-artifacts/performance');
    this.testMetrics = [];
    this.suiteStartTime = null;
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  onBegin(config, suite) {
    this.suiteStartTime = Date.now();
    this.totalTests = suite.allTests().length;
    
    console.log('🚀 Test suite started - Performance monitoring active');
    console.log(`📊 Total tests to run: ${this.totalTests}`);
    console.log(`🔧 Workers: ${config.workers}`);
    console.log(`🌐 Projects: ${config.projects.map(p => p.name).join(', ')}`);
  }

  onTestBegin(test) {
    test._startTime = Date.now();
    test._startMemory = process.memoryUsage();
  }

  onTestEnd(test, result) {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = result.duration;
    
    const testMetric = {
      title: test.title,
      file: test.location.file,
      line: test.location.line,
      status: result.status,
      duration: duration,
      startTime: new Date(test._startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      memory: {
        start: {
          rss: Math.round(test._startMemory.rss / 1024 / 1024), // MB
          heapUsed: Math.round(test._startMemory.heapUsed / 1024 / 1024)
        },
        end: {
          rss: Math.round(endMemory.rss / 1024 / 1024), // MB
          heapUsed: Math.round(endMemory.heapUsed / 1024 / 1024)
        },
        delta: {
          rss: Math.round((endMemory.rss - test._startMemory.rss) / 1024 / 1024),
          heapUsed: Math.round((endMemory.heapUsed - test._startMemory.heapUsed) / 1024 / 1024)
        }
      },
      retries: result.retry,
      errors: result.errors.map(error => ({
        message: error.message,
        location: error.location
      }))
    };

    this.testMetrics.push(testMetric);

    // Log performance info for long-running or failed tests
    if (duration > 10000 || result.status !== 'passed') {
      const memoryChange = testMetric.memory.delta.rss > 0 ? `+${testMetric.memory.delta.rss}MB` : `${testMetric.memory.delta.rss}MB`;
      console.log(`📊 ${test.title} | ${duration}ms | ${result.status} | Memory: ${memoryChange}`);
    }
  }

  onEnd(result) {
    const totalDuration = Date.now() - this.suiteStartTime;
    const passedTests = this.testMetrics.filter(t => t.status === 'passed').length;
    const failedTests = this.testMetrics.filter(t => t.status === 'failed').length;
    const skippedTests = this.testMetrics.filter(t => t.status === 'skipped').length;

    const summary = {
      metadata: {
        startTime: new Date(this.suiteStartTime).toISOString(),
        endTime: new Date().toISOString(),
        totalDuration: totalDuration,
        totalTests: this.totalTests
      },
      results: {
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        passRate: ((passedTests / this.totalTests) * 100).toFixed(1)
      },
      performance: {
        avgTestDuration: Math.round(totalDuration / this.totalTests),
        slowestTests: this.getSlowTests(5),
        fastestTests: this.getFastTests(5),
        memoryIntensiveTests: this.getMemoryIntensiveTests(5),
        failedTests: this.testMetrics.filter(t => t.status === 'failed')
      },
      testMetrics: this.testMetrics
    };

    // Generate reports
    this.generateDetailedReport(summary);
    this.generateSummaryReport(summary);
    this.logSummary(summary);
  }

  generateDetailedReport(summary) {
    const reportPath = path.join(this.outputDir, `test-performance-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`📈 Detailed test performance report: ${reportPath}`);
  }

  generateSummaryReport(summary) {
    const summaryText = `Test Performance Summary
=======================
Execution Time: ${Math.round(summary.metadata.totalDuration / 1000)}s
Total Tests: ${summary.metadata.totalTests}
Passed: ${summary.results.passed} (${summary.results.passRate}%)
Failed: ${summary.results.failed}
Skipped: ${summary.results.skipped}
Average Test Duration: ${summary.performance.avgTestDuration}ms

Slowest Tests:
${summary.performance.slowestTests.map((t, i) => `${i + 1}. ${t.title} (${t.duration}ms)`).join('\n')}

Memory Intensive Tests:
${summary.performance.memoryIntensiveTests.map((t, i) => `${i + 1}. ${t.title} (+${t.memory.delta.rss}MB)`).join('\n')}

Generated: ${new Date().toISOString()}
`;

    const summaryPath = path.join(this.outputDir, `test-summary-${Date.now()}.txt`);
    fs.writeFileSync(summaryPath, summaryText);
    console.log(`📄 Test summary report: ${summaryPath}`);
  }

  logSummary(summary) {
    console.log('\n📊 Test Performance Summary:');
    console.log('============================');
    console.log(`⏱️  Total Duration: ${Math.round(summary.metadata.totalDuration / 1000)}s`);
    console.log(`✅ Passed: ${summary.results.passed}/${summary.metadata.totalTests} (${summary.results.passRate}%)`);
    console.log(`❌ Failed: ${summary.results.failed}`);
    console.log(`⏭️  Skipped: ${summary.results.skipped}`);
    console.log(`📈 Avg Test Duration: ${summary.performance.avgTestDuration}ms`);
    
    if (summary.performance.slowestTests.length > 0) {
      console.log(`🐌 Slowest Test: ${summary.performance.slowestTests[0].title} (${summary.performance.slowestTests[0].duration}ms)`);
    }
    
    if (summary.performance.memoryIntensiveTests.length > 0) {
      const memTest = summary.performance.memoryIntensiveTests[0];
      console.log(`🧠 Most Memory Intensive: ${memTest.title} (+${memTest.memory.delta.rss}MB)`);
    }
    
    console.log('');
  }

  getSlowTests(count = 5) {
    return [...this.testMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
      .map(t => ({ title: t.title, duration: t.duration, file: t.file }));
  }

  getFastTests(count = 5) {
    return [...this.testMetrics]
      .filter(t => t.status === 'passed')
      .sort((a, b) => a.duration - b.duration)
      .slice(0, count)
      .map(t => ({ title: t.title, duration: t.duration, file: t.file }));
  }

  getMemoryIntensiveTests(count = 5) {
    return [...this.testMetrics]
      .sort((a, b) => b.memory.delta.rss - a.memory.delta.rss)
      .slice(0, count)
      .map(t => ({ 
        title: t.title, 
        memory: t.memory, 
        duration: t.duration,
        file: t.file 
      }));
  }
}

module.exports = PerformanceReporter;