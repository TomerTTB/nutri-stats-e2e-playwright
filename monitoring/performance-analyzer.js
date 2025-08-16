#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor() {
    this.performanceDir = path.join(__dirname, '../test-artifacts/performance');
  }

  async analyzeReports() {
    console.log('📊 Performance Report Analysis');
    console.log('==============================');

    if (!fs.existsSync(this.performanceDir)) {
      console.log('❌ No performance reports found');
      return;
    }

    const files = fs.readdirSync(this.performanceDir);
    const reportFiles = files.filter(f => f.startsWith('performance-report-') && f.endsWith('.json'));
    const testReportFiles = files.filter(f => f.startsWith('test-performance-') && f.endsWith('.json'));

    if (reportFiles.length === 0 && testReportFiles.length === 0) {
      console.log('❌ No performance report files found');
      return;
    }

    // Analyze system performance reports
    if (reportFiles.length > 0) {
      console.log(`\n🔍 System Performance Reports (${reportFiles.length} found):`);
      await this.analyzeSystemReports(reportFiles);
    }

    // Analyze test performance reports
    if (testReportFiles.length > 0) {
      console.log(`\n🧪 Test Performance Reports (${testReportFiles.length} found):`);
      await this.analyzeTestReports(testReportFiles);
    }

    // Generate comparison if multiple reports exist
    if (reportFiles.length > 1) {
      console.log('\n📈 Performance Trends:');
      await this.generateTrends(reportFiles);
    }
  }

  async analyzeSystemReports(reportFiles) {
    const latestReport = reportFiles.sort().pop();
    const reportPath = path.join(this.performanceDir, latestReport);
    
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      console.log(`📄 Latest Report: ${latestReport}`);
      console.log(`⏱️  Duration: ${Math.round(report.metadata.duration / 1000)}s`);
      console.log(`📊 Samples: ${report.metadata.totalSamples}`);
      console.log(`🧠 Memory Usage: ${report.summary.memory.avg}% (peak: ${report.summary.memory.max}%)`);
      console.log(`⚡ CPU Load: ${report.summary.cpu.avg} (peak: ${report.summary.cpu.max})`);
      console.log(`💾 Process Memory: ${report.summary.process.avg}MB (peak: ${report.summary.process.max}MB)`);

      // Identify performance issues
      this.identifyIssues(report);

    } catch (error) {
      console.error(`❌ Error reading report ${latestReport}:`, error.message);
    }
  }

  async analyzeTestReports(testReportFiles) {
    const latestReport = testReportFiles.sort().pop();
    const reportPath = path.join(this.performanceDir, latestReport);
    
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      console.log(`📄 Latest Test Report: ${latestReport}`);
      console.log(`⏱️  Total Duration: ${Math.round(report.metadata.totalDuration / 1000)}s`);
      console.log(`🧪 Total Tests: ${report.metadata.totalTests}`);
      console.log(`✅ Pass Rate: ${report.results.passRate}%`);
      console.log(`📈 Avg Test Duration: ${report.performance.avgTestDuration}ms`);

      // Show slowest tests
      if (report.performance.slowestTests.length > 0) {
        console.log('\n🐌 Slowest Tests:');
        report.performance.slowestTests.slice(0, 3).forEach((test, i) => {
          console.log(`   ${i + 1}. ${test.title} (${test.duration}ms)`);
        });
      }

      // Show memory intensive tests
      if (report.performance.memoryIntensiveTests.length > 0) {
        console.log('\n🧠 Memory Intensive Tests:');
        report.performance.memoryIntensiveTests.slice(0, 3).forEach((test, i) => {
          console.log(`   ${i + 1}. ${test.title} (+${test.memory.delta.rss}MB)`);
        });
      }

      // Show failed tests if any
      if (report.performance.failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        report.performance.failedTests.forEach((test, i) => {
          console.log(`   ${i + 1}. ${test.title} (${test.duration}ms)`);
        });
      }

    } catch (error) {
      console.error(`❌ Error reading test report ${latestReport}:`, error.message);
    }
  }

  identifyIssues(report) {
    const issues = [];

    // Check for high memory usage
    if (parseFloat(report.summary.memory.max) > 80) {
      issues.push(`⚠️  High memory usage detected: ${report.summary.memory.max}%`);
    }

    // Check for high CPU load
    if (parseFloat(report.summary.cpu.max) > 2.0) {
      issues.push(`⚠️  High CPU load detected: ${report.summary.cpu.max}`);
    }

    // Check for memory leaks (process memory growth)
    const memoryGrowth = report.summary.process.max - report.summary.process.min;
    if (memoryGrowth > 500) { // More than 500MB growth
      issues.push(`⚠️  Potential memory leak: Process memory grew by ${memoryGrowth}MB`);
    }

    if (issues.length > 0) {
      console.log('\n🚨 Performance Issues Detected:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('\n✅ No performance issues detected');
    }
  }

  async generateTrends(reportFiles) {
    const reports = [];
    
    for (const file of reportFiles.sort()) {
      try {
        const reportPath = path.join(this.performanceDir, file);
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        reports.push({
          file,
          timestamp: report.metadata.startTime,
          duration: report.metadata.duration,
          memoryAvg: parseFloat(report.summary.memory.avg),
          memoryMax: parseFloat(report.summary.memory.max),
          cpuAvg: parseFloat(report.summary.cpu.avg),
          cpuMax: parseFloat(report.summary.cpu.max)
        });
      } catch (error) {
        console.warn(`⚠️  Skipping invalid report: ${file}`);
      }
    }

    if (reports.length < 2) {
      console.log('📊 Need at least 2 reports for trend analysis');
      return;
    }

    const latest = reports[reports.length - 1];
    const previous = reports[reports.length - 2];

    console.log('📈 Performance Comparison (Latest vs Previous):');
    console.log(`   Duration: ${Math.round(latest.duration / 1000)}s vs ${Math.round(previous.duration / 1000)}s (${this.getChange(latest.duration, previous.duration)})`);
    console.log(`   Avg Memory: ${latest.memoryAvg}% vs ${previous.memoryAvg}% (${this.getChange(latest.memoryAvg, previous.memoryAvg)})`);
    console.log(`   Max Memory: ${latest.memoryMax}% vs ${previous.memoryMax}% (${this.getChange(latest.memoryMax, previous.memoryMax)})`);
    console.log(`   Avg CPU: ${latest.cpuAvg} vs ${previous.cpuAvg} (${this.getChange(latest.cpuAvg, previous.cpuAvg)})`);
    console.log(`   Max CPU: ${latest.cpuMax} vs ${previous.cpuMax} (${this.getChange(latest.cpuMax, previous.cpuMax)})`);
  }

  getChange(current, previous) {
    const change = ((current - previous) / previous * 100).toFixed(1);
    const symbol = change > 0 ? '+' : '';
    const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
    return `${symbol}${change}% ${emoji}`;
  }

  async generateSummaryReport() {
    const summaryPath = path.join(this.performanceDir, 'analysis-summary.txt');
    const timestamp = new Date().toISOString();
    
    const summary = `Performance Analysis Summary
===========================
Generated: ${timestamp}

This analysis was generated by the Performance Analyzer.
Check individual report files for detailed metrics.

To run analysis again:
npm run performance:analyze

To view performance trends:
npm run performance:trends
`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`\n📄 Analysis summary saved: ${summaryPath}`);
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.analyzeReports()
    .then(() => analyzer.generateSummaryReport())
    .catch(error => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceAnalyzer;