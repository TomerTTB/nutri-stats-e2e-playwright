const fs = require('fs');
const os = require('os');
const path = require('path');

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.startTime = Date.now();
    this.outputDir = path.join(__dirname, '../test-artifacts/performance');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async collectMetrics() {
    const memUsage = process.memoryUsage();
    const systemMem = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    const metrics = {
      timestamp: new Date().toISOString(),
      elapsed: Date.now() - this.startTime,
      memory: {
        process: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        },
        system: {
          total: Math.round(systemMem.total / 1024 / 1024), // MB
          free: Math.round(systemMem.free / 1024 / 1024), // MB
          used: Math.round(systemMem.used / 1024 / 1024), // MB
          usage: ((systemMem.used / systemMem.total) * 100).toFixed(1) // %
        }
      },
      cpu: {
        loadAvg: os.loadavg().map(load => parseFloat(load.toFixed(2))),
        cpuCount: os.cpus().length,
        uptime: Math.round(os.uptime())
      }
    };
    
    this.metrics.push(metrics);
    return metrics;
  }

  async startMonitoring(intervalMs = 5000) {
    console.log('🔍 Starting performance monitoring...');
    console.log(`📊 Monitoring interval: ${intervalMs}ms`);
    
    // Collect initial metrics
    await this.collectMetrics();
    
    this.interval = setInterval(async () => {
      const metrics = await this.collectMetrics();
      const elapsed = Math.round(metrics.elapsed / 1000);
      console.log(`📊 [${elapsed}s] Memory: ${metrics.memory.system.usage}% | Load: ${metrics.cpu.loadAvg[0]} | Process: ${metrics.memory.process.rss}MB`);
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    // Collect final metrics
    this.collectMetrics();
    
    // Generate reports
    this.generateReport();
    this.generateSummary();
  }

  generateReport() {
    const report = {
      metadata: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        totalSamples: this.metrics.length,
        samplingInterval: this.metrics.length > 1 ? this.metrics[1].elapsed - this.metrics[0].elapsed : 0
      },
      summary: this.calculateSummary(),
      metrics: this.metrics
    };

    const reportPath = path.join(this.outputDir, `performance-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📈 Performance report generated: ${reportPath}`);
    
    return report;
  }

  generateSummary() {
    const summary = this.calculateSummary();
    
    console.log('\n📊 Performance Summary:');
    console.log('========================');
    console.log(`Duration: ${Math.round(summary.duration / 1000)}s`);
    console.log(`Samples: ${summary.totalSamples}`);
    console.log(`Memory Usage: ${summary.memory.avg}% (peak: ${summary.memory.max}%)`);
    console.log(`CPU Load: ${summary.cpu.avg} (peak: ${summary.cpu.max})`);
    console.log(`Process Memory: ${summary.process.avg}MB (peak: ${summary.process.max}MB)`);
    
    // Write summary to file
    const summaryPath = path.join(this.outputDir, `performance-summary-${Date.now()}.txt`);
    const summaryText = `Performance Summary
==================
Duration: ${Math.round(summary.duration / 1000)}s
Samples: ${summary.totalSamples}
Memory Usage: ${summary.memory.avg}% (peak: ${summary.memory.max}%)
CPU Load: ${summary.cpu.avg} (peak: ${summary.cpu.max})
Process Memory: ${summary.process.avg}MB (peak: ${summary.process.max}MB)
Generated: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(summaryPath, summaryText);
    console.log(`📄 Summary saved: ${summaryPath}\n`);
  }

  calculateSummary() {
    if (this.metrics.length === 0) return {};

    const memoryUsages = this.metrics.map(m => parseFloat(m.memory.system.usage));
    const cpuLoads = this.metrics.map(m => m.cpu.loadAvg[0]);
    const processMemory = this.metrics.map(m => m.memory.process.rss);

    return {
      duration: Date.now() - this.startTime,
      totalSamples: this.metrics.length,
      memory: {
        avg: (memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length).toFixed(1),
        max: Math.max(...memoryUsages).toFixed(1),
        min: Math.min(...memoryUsages).toFixed(1)
      },
      cpu: {
        avg: (cpuLoads.reduce((a, b) => a + b, 0) / cpuLoads.length).toFixed(2),
        max: Math.max(...cpuLoads).toFixed(2),
        min: Math.min(...cpuLoads).toFixed(2)
      },
      process: {
        avg: Math.round(processMemory.reduce((a, b) => a + b, 0) / processMemory.length),
        max: Math.max(...processMemory),
        min: Math.min(...processMemory)
      }
    };
  }
}

module.exports = PerformanceMonitor;