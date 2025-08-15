#!/usr/bin/env node

/**
 * Test Artifacts Management Script
 * 
 * This script helps manage test artifacts including cleanup, organization,
 * and migration from old structure to new structure.
 */

const fs = require('fs').promises;
const path = require('path');

const ARTIFACTS_DIR = path.join(__dirname, '..', 'test-artifacts');
const OLD_SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const OLD_REPORTS_DIR = path.join(__dirname, '..', 'reports');
const OLD_TEST_RESULTS_DIR = path.join(__dirname, '..', 'test-results');

/**
 * Create artifact directory structure
 */
async function createArtifactStructure() {
  const dirs = [
    path.join(ARTIFACTS_DIR, 'screenshots'),
    path.join(ARTIFACTS_DIR, 'videos'),
    path.join(ARTIFACTS_DIR, 'traces'),
    path.join(ARTIFACTS_DIR, 'reports', 'html-report'),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to create directory ${dir}:`, error.message);
    }
  }
}

/**
 * Migrate old artifacts to new structure
 */
async function migrateOldArtifacts() {
  console.log('🔄 Migrating old artifacts to new structure...');

  // Migrate screenshots
  try {
    const oldScreenshotsExist = await fs.access(OLD_SCREENSHOTS_DIR).then(() => true).catch(() => false);
    if (oldScreenshotsExist) {
      const files = await fs.readdir(OLD_SCREENSHOTS_DIR);
      const newScreenshotsDir = path.join(ARTIFACTS_DIR, 'screenshots');
      
      for (const file of files) {
        if (file.endsWith('.png')) {
          const oldPath = path.join(OLD_SCREENSHOTS_DIR, file);
          const newPath = path.join(newScreenshotsDir, file);
          await fs.copyFile(oldPath, newPath);
          console.log(`📸 Migrated screenshot: ${file}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not migrate screenshots:', error.message);
  }

  // Migrate reports
  try {
    const oldReportsExist = await fs.access(OLD_REPORTS_DIR).then(() => true).catch(() => false);
    if (oldReportsExist) {
      const newReportsDir = path.join(ARTIFACTS_DIR, 'reports');
      await copyDirectory(OLD_REPORTS_DIR, newReportsDir);
      console.log('📊 Migrated reports');
    }
  } catch (error) {
    console.warn('⚠️ Could not migrate reports:', error.message);
  }

  console.log('✅ Migration completed');
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Clean up artifacts
 */
async function cleanupArtifacts(options = {}) {
  const {
    screenshots = false,
    videos = false,
    traces = false,
    reports = false,
    all = false,
    olderThan = null // Date object
  } = options;

  console.log('🧹 Cleaning up artifacts...');

  if (all) {
    try {
      await fs.rmdir(ARTIFACTS_DIR, { recursive: true });
      console.log('🗑️ Removed all artifacts');
      await createArtifactStructure();
      return;
    } catch (error) {
      console.error('❌ Failed to remove all artifacts:', error.message);
      return;
    }
  }

  const cleanupTasks = [];

  if (screenshots) {
    cleanupTasks.push({
      name: 'screenshots',
      dir: path.join(ARTIFACTS_DIR, 'screenshots'),
      extensions: ['.png', '.jpg', '.jpeg']
    });
  }

  if (videos) {
    cleanupTasks.push({
      name: 'videos',
      dir: path.join(ARTIFACTS_DIR, 'videos'),
      extensions: ['.webm', '.mp4']
    });
  }

  if (traces) {
    cleanupTasks.push({
      name: 'traces',
      dir: path.join(ARTIFACTS_DIR, 'traces'),
      extensions: ['.zip']
    });
  }

  if (reports) {
    cleanupTasks.push({
      name: 'reports',
      dir: path.join(ARTIFACTS_DIR, 'reports'),
      extensions: ['.json', '.xml', '.html']
    });
  }

  for (const task of cleanupTasks) {
    try {
      await cleanupDirectory(task.dir, task.extensions, olderThan);
      console.log(`🗑️ Cleaned up ${task.name}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup ${task.name}:`, error.message);
    }
  }
}

/**
 * Clean up directory with optional age filter
 */
async function cleanupDirectory(dir, extensions, olderThan) {
  try {
    const files = await fs.readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);
      
      // Check if file matches extension filter
      if (extensions && extensions.length > 0) {
        const hasMatchingExtension = extensions.some(ext => file.endsWith(ext));
        if (!hasMatchingExtension) continue;
      }
      
      // Check if file is older than specified date
      if (olderThan && stats.mtime > olderThan) {
        continue;
      }
      
      if (stats.isDirectory()) {
        await fs.rmdir(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Get artifact statistics
 */
async function getArtifactStats() {
  const stats = {
    screenshots: { count: 0, size: 0 },
    videos: { count: 0, size: 0 },
    traces: { count: 0, size: 0 },
    reports: { count: 0, size: 0 },
    total: { count: 0, size: 0 }
  };

  const dirs = [
    { name: 'screenshots', path: path.join(ARTIFACTS_DIR, 'screenshots') },
    { name: 'videos', path: path.join(ARTIFACTS_DIR, 'videos') },
    { name: 'traces', path: path.join(ARTIFACTS_DIR, 'traces') },
    { name: 'reports', path: path.join(ARTIFACTS_DIR, 'reports') }
  ];

  for (const dir of dirs) {
    try {
      const dirStats = await getDirectoryStats(dir.path);
      stats[dir.name] = dirStats;
      stats.total.count += dirStats.count;
      stats.total.size += dirStats.size;
    } catch (error) {
      // Directory doesn't exist, keep zeros
    }
  }

  return stats;
}

/**
 * Get directory statistics
 */
async function getDirectoryStats(dirPath) {
  const stats = { count: 0, size: 0 };
  
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        const subStats = await getDirectoryStats(filePath);
        stats.count += subStats.count;
        stats.size += subStats.size;
      } else {
        const fileStats = await fs.stat(filePath);
        stats.count++;
        stats.size += fileStats.size;
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return stats;
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init':
      await createArtifactStructure();
      break;

    case 'migrate':
      await createArtifactStructure();
      await migrateOldArtifacts();
      break;

    case 'clean':
      const cleanOptions = {};
      if (args.includes('--screenshots')) cleanOptions.screenshots = true;
      if (args.includes('--videos')) cleanOptions.videos = true;
      if (args.includes('--traces')) cleanOptions.traces = true;
      if (args.includes('--reports')) cleanOptions.reports = true;
      if (args.includes('--all')) cleanOptions.all = true;
      
      const olderThanArg = args.find(arg => arg.startsWith('--older-than='));
      if (olderThanArg) {
        const days = parseInt(olderThanArg.split('=')[1]);
        cleanOptions.olderThan = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }
      
      await cleanupArtifacts(cleanOptions);
      break;

    case 'stats':
      const stats = await getArtifactStats();
      console.log('\n📊 Artifact Statistics:');
      console.log('========================');
      console.log(`Screenshots: ${stats.screenshots.count} files (${formatBytes(stats.screenshots.size)})`);
      console.log(`Videos:      ${stats.videos.count} files (${formatBytes(stats.videos.size)})`);
      console.log(`Traces:      ${stats.traces.count} files (${formatBytes(stats.traces.size)})`);
      console.log(`Reports:     ${stats.reports.count} files (${formatBytes(stats.reports.size)})`);
      console.log('------------------------');
      console.log(`Total:       ${stats.total.count} files (${formatBytes(stats.total.size)})`);
      break;

    default:
      console.log(`
Test Artifacts Management Script

Usage:
  node manage-artifacts.js <command> [options]

Commands:
  init                    Create artifact directory structure
  migrate                 Migrate old artifacts to new structure
  clean [options]         Clean up artifacts
  stats                   Show artifact statistics

Clean Options:
  --screenshots          Clean up screenshots
  --videos              Clean up videos
  --traces              Clean up traces
  --reports             Clean up reports
  --all                 Clean up everything
  --older-than=<days>   Only clean files older than N days

Examples:
  node manage-artifacts.js init
  node manage-artifacts.js migrate
  node manage-artifacts.js clean --screenshots --older-than=7
  node manage-artifacts.js clean --all
  node manage-artifacts.js stats
      `);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createArtifactStructure,
  migrateOldArtifacts,
  cleanupArtifacts,
  getArtifactStats
};