#!/usr/bin/env node

/**
 * Test Database Setup Script
 * Creates and initializes a test database with sample data
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test-nutrition_app.db');

async function setupTestDatabase() {
  console.log('🚀 Setting up test database...');
  
  // Remove existing test database if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log('Removed existing test database');
  }
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(TEST_DB_PATH, (err) => {
      if (err) {
        console.error('Error creating test database:', err);
        reject(err);
        return;
      }
      console.log('Test database created successfully');
    });

    // Create tables
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Foods table
      db.run(`CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL,
        amount TEXT DEFAULT '100',
        calories REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        protein REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        proteinGeneral REAL DEFAULT 0,
        source TEXT DEFAULT 'test',
        isCustom BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Meals table
      db.run(`CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        food_id INTEGER,
        quantity REAL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (food_id) REFERENCES foods (id)
      )`);

      // Weight entries table
      db.run(`CREATE TABLE IF NOT EXISTS weight_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT NOT NULL,
        weight REAL NOT NULL,
        unit TEXT DEFAULT 'lbs',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

      // Insert sample food data that tests can use
      const sampleFoods = [
        { item: 'MetRX - Apple', calories: 390, carbs: 48, protein: 30, fat: 9 },
        { item: 'MetRX - Peanut', calories: 420, carbs: 35, protein: 32, fat: 12 },
        { item: 'Test Food - Chicken', calories: 165, carbs: 0, protein: 31, fat: 3.6 },
        { item: 'Test Food - Rice', calories: 130, carbs: 28, protein: 2.7, fat: 0.3 },
        { item: 'Test Food - Banana', calories: 89, carbs: 23, protein: 1.1, fat: 0.3 }
      ];

      const insertFood = db.prepare(`INSERT INTO foods (item, calories, carbs, protein, fat, source) VALUES (?, ?, ?, ?, ?, 'test')`);
      
      sampleFoods.forEach(food => {
        insertFood.run(food.item, food.calories, food.carbs, food.protein, food.fat);
      });
      
      insertFood.finalize();

      console.log('✅ Test database setup complete');
      console.log(`📍 Database location: ${TEST_DB_PATH}`);
      console.log(`📊 Sample foods added: ${sampleFoods.length}`);
    });

    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Run setup if called directly
if (require.main === module) {
  setupTestDatabase().catch(console.error);
}

module.exports = setupTestDatabase;