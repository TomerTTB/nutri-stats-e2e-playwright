# Performance Monitoring Guide

This guide explains how to use the built-in performance monitoring system for the E2E testing framework.

## 🔍 Overview

The performance monitoring system provides comprehensive insights into:
- **System Resources**: CPU, memory, and load during test execution
- **Test Performance**: Individual test timing and resource usage
- **Trends Analysis**: Performance comparison across test runs
- **Issue Detection**: Automatic identification of performance problems

## 📊 Monitoring Components

### 1. System Performance Monitor (Local)
- **File**: `monitoring/performance-monitor.js`
- **Purpose**: Tracks system-level resources during test execution
- **Metrics**: CPU load, memory usage, process memory, uptime
- **Interval**: 5-second sampling by default

### 2. Test Performance Reporter (Local)
- **File**: `monitoring/performance-reporter.js`
- **Purpose**: Tracks individual test performance and resource usage
- **Metrics**: Test duration, memory delta, failure analysis
- **Integration**: Built into Playwright reporter system

### 3. DataDog Reporter (Cloud)
- **File**: `monitoring/datadog-reporter.js`
- **Purpose**: Sends performance metrics to DataDog for cloud monitoring
- **Metrics**: Real-time metrics, dashboards, alerting
- **Integration**: APM tracing and custom metrics

### 4. Performance Analyzer
- **File**: `monitoring/performance-analyzer.js`
- **Purpose**: Analyzes performance reports and identifies trends
- **Features**: Issue detection, trend analysis, summary generation

### 5. Monitoring Configuration
- **File**: `monitoring/monitoring-config.js`
- **Purpose**: Centralized configuration for all monitoring backends
- **Features**: Backend selection, validation, reporter management

## 🚀 Quick Start

### Running Tests with Performance Monitoring

Performance monitoring is **automatically enabled** for all test runs. You can choose between local monitoring, DataDog, or both:

```bash
# Local monitoring only (default)
npm test

# DataDog monitoring only
npm run test:datadog

# Both local and DataDog monitoring
npm run test:both

# View performance reports after test run
npm run performance:analyze

# Check performance artifacts
npm run performance:stats
```

### DataDog Setup (Optional)

#### Local Development
```bash
# Install DataDog dependencies
npm run datadog:install

# Configure environment variables
cp .env.datadog .env.test
# Edit .env.test with your DataDog API key

# Test DataDog connection
npm run datadog:test

# Run tests with DataDog monitoring
npm run test:datadog
```

#### GitHub Actions (Recommended)
The GitHub Actions workflow automatically uses a DataDog Agent service container when `DD_API_KEY` secret is configured:

1. **Add GitHub Secret**: Go to repository Settings → Secrets → Add `DD_API_KEY`
2. **Automatic Setup**: The workflow automatically:
   - Starts DataDog Agent as a service container
   - Enables CI Visibility and APM tracing
   - Configures proper agent URLs and tags
   - Waits for agent health check before running tests

#### Features with DataDog Agent:
- **CI Visibility**: Test execution traces in DataDog
- **APM Tracing**: Detailed performance traces
- **Real-time Metrics**: Live dashboards during test runs
- **Git Integration**: Commit info, branch, and author tracking
- **Pipeline Correlation**: Link test results to CI/CD pipelines

### Manual Performance Analysis

```bash
# Analyze latest performance reports
npm run performance:analyze

# Clean old performance data
npm run performance:clean

# View performance artifacts directory
ls -la test-artifacts/performance/
```

## 📈 Understanding Reports

### System Performance Report
```json
{
  "metadata": {
    "startTime": "2024-01-15T10:30:00.000Z",
    "endTime": "2024-01-15T10:35:00.000Z",
    "duration": 300000,
    "totalSamples": 60
  },
  "summary": {
    "memory": {
      "avg": "45.2",
      "max": "67.8",
      "min": "32.1"
    },
    "cpu": {
      "avg": "1.25",
      "max": "2.45",
      "min": "0.85"
    }
  }
}
```

### Test Performance Report
```json
{
  "performance": {
    "avgTestDuration": 2500,
    "slowestTests": [
      {
        "title": "should handle complex food search",
        "duration": 8500,
        "file": "tests/foods/food-search.spec.js"
      }
    ],
    "memoryIntensiveTests": [
      {
        "title": "should load large dataset",
        "memory": {
          "delta": {
            "rss": 45
          }
        }
      }
    ]
  }
}
```

## 🎯 Performance Metrics Explained

### System Metrics

| Metric | Description | Good Range | Warning Level |
|--------|-------------|------------|---------------|
| **Memory Usage %** | System memory utilization | < 70% | > 80% |
| **CPU Load** | Average system load | < 2.0 | > 3.0 |
| **Process Memory** | Test process memory usage | < 1GB | > 2GB |

### Test Metrics

| Metric | Description | Good Range | Warning Level |
|--------|-------------|------------|---------------|
| **Test Duration** | Individual test execution time | < 5s | > 10s |
| **Memory Delta** | Memory change during test | < 50MB | > 100MB |
| **Pass Rate** | Percentage of passing tests | > 95% | < 90% |

## 🚨 Performance Issue Detection

The analyzer automatically detects:

### High Memory Usage
```
⚠️ High memory usage detected: 85.2%
```
**Cause**: Too many browser instances or memory leaks
**Solution**: Reduce parallel workers or investigate memory leaks

### High CPU Load
```
⚠️ High CPU load detected: 3.45
```
**Cause**: CPU-intensive operations or too many parallel tests
**Solution**: Reduce worker count or optimize test operations

### Memory Leaks
```
⚠️ Potential memory leak: Process memory grew by 750MB
```
**Cause**: Tests not properly cleaning up resources
**Solution**: Review test cleanup and browser context management

## 📊 GitHub Actions Integration

### Automatic Monitoring
The GitHub Actions workflow automatically:
1. Logs system information before/after tests
2. Monitors resources during test execution
3. Uploads performance reports as artifacts
4. Displays performance summary in logs

### Accessing Reports
1. Go to **Actions** tab in GitHub
2. Select a workflow run
3. Download **performance-reports** artifact
4. Extract and analyze JSON/text reports

### Example Workflow Output
```
📊 Performance Summary:
============================
⏱️  Total Duration: 245s
✅ Passed: 280/282 (99.3%)
❌ Failed: 2
📈 Avg Test Duration: 2,150ms
🐌 Slowest Test: complex authentication flow (8,500ms)
🧠 Most Memory Intensive: large dataset test (+67MB)
```

## 🔧 Configuration

### Monitoring Backend Selection
Choose your monitoring backend via environment variables:

```bash
# Local monitoring only (default)
MONITORING_BACKEND=local

# DataDog monitoring only
MONITORING_BACKEND=datadog

# Both local and DataDog monitoring
MONITORING_BACKEND=both
```

### Local Monitoring Configuration
```bash
# Enable/disable local monitoring
LOCAL_MONITORING=true

# Monitoring interval (milliseconds)
MONITORING_INTERVAL=5000
```

### DataDog Configuration
```bash
# Enable DataDog monitoring
DATADOG_ENABLED=true
DD_API_KEY=your_api_key_here
DD_SITE=datadoghq.com
DD_SERVICE=e2e-tests
DD_ENV=test
DD_VERSION=1.0.0
DD_TAGS=team:qa,project:nutristats

# Custom thresholds
DD_SLOW_TEST_THRESHOLD=10000
DD_MEMORY_THRESHOLD=100
```

### Report Retention
- **Local Reports**: `test-artifacts/performance/` - kept until manually cleaned
- **DataDog**: Real-time dashboards with configurable retention
- **GitHub Actions**: 30 days retention for performance reports

### Configuration Files
- `.env.datadog` - DataDog-only configuration template
- `.env.both` - Dual monitoring configuration template
- `.env.test` - Your active configuration (copy from templates)

## 📚 Best Practices

### 1. Regular Analysis
- Run `npm run performance:analyze` after significant changes
- Monitor trends over time to catch performance regressions
- Set up alerts for performance degradation

### 2. Resource Management
- Keep memory usage below 80% during test runs
- Monitor CPU load and adjust worker count accordingly
- Clean up performance artifacts regularly

### 3. Test Optimization
- Investigate tests that consistently appear in "slowest tests"
- Optimize memory-intensive tests
- Consider splitting long-running tests

### 4. CI/CD Integration
- Use performance reports to make informed decisions about infrastructure
- Set up performance budgets and fail builds on regression
- Archive performance data for historical analysis

## 🛠️ Troubleshooting

### No Performance Reports Generated
**Check**: 
- Performance monitoring is enabled in config
- Tests completed successfully
- `test-artifacts/performance/` directory exists

### High Memory Usage Warnings
**Solutions**:
- Reduce `workers` count in `playwright.config.js`
- Ensure proper cleanup in test teardown
- Check for browser context leaks

### Inconsistent Performance Data
**Causes**:
- System load variations
- Different test execution order
- External factors (network, disk I/O)

**Solutions**:
- Run tests multiple times for baseline
- Use dedicated test environment
- Monitor external dependencies

## 📞 Support

For performance monitoring issues:
1. Check the generated reports in `test-artifacts/performance/`
2. Run `npm run performance:analyze` for detailed analysis
3. Review system resources during test execution
4. Consult this guide for optimization strategies

---

**Performance monitoring helps ensure your E2E tests run efficiently and reliably! 🚀**