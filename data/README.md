# Test Database Setup

This directory contains the test database and related files for the e2e test suite.

## Directory Structure:

```
data/
├── origin/
│   ├── nutrition_app.db          ← Master database (NEVER MODIFIED)
│   └── README.md
├── test-nutrition_app.db         ← Working copy during tests (auto-created/deleted)
└── README.md                     ← This file
```

## Files:

- `origin/nutrition_app.db` - Master database copy used as source for tests
- `test-nutrition_app.db` - Working database copy (created during tests, deleted after)

## Workflow:

1. **Before Tests:** Copy `origin/nutrition_app.db` → `test-nutrition_app.db`
2. **During Tests:** Your app uses `test-nutrition_app.db`
3. **After Tests:** Delete `test-nutrition_app.db`
4. **Master Safe:** `origin/nutrition_app.db` is never touched

## Setup Instructions:

1. **Place Master Database:** Copy your working `nutrition_app.db` to `origin/nutrition_app.db`
2. **Update Your App:** Use the config from `config-example.js` to detect test database
3. **Run Tests:** Use `npm run test:safe`

## Safety:

- ✅ Production SRC database is completely isolated
- ✅ Master copy in origin/ is never modified during tests
- ✅ Working copy is automatically cleaned up
- ✅ Multiple developers can share the same master copy
- ✅ Easy to reset by replacing master copy

## Configuration:

The database paths are configured in `.env.test`:
```
ORIGIN_DB_PATH=./data/origin/nutrition_app.db
TEST_DB_PATH=./data/test-nutrition_app.db
```