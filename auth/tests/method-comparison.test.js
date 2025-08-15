/**
 * Test to compare different authentication methods and show their differences
 */

// Import the auth module to ensure methods are registered
require('../index');
const { AuthMethodFactory } = require('../factory/auth-method-factory');

async function compareAuthMethods() {
    console.log('🔍 Comparing Authentication Methods');
    console.log('=====================================\n');

    const config = {
        baseURL: 'http://localhost:8080',
        validateWithAPI: false // Disable API validation for comparison
    };

    // Test JWT method
    console.log('1️⃣ JWT Authentication Method:');
    const jwtMethod = AuthMethodFactory.create('jwt', config);
    console.log(`   - Type: ${jwtMethod.getType()}`);
    console.log(`   - Supports Storage State: ${jwtMethod.supportsStorageState()}`);
    console.log(`   - Strategy: JWT token-based with storage state`);
    console.log(`   - Login Process: API-based, saves to storage state file`);
    console.log('');

    // Test Login method
    console.log('2️⃣ Login Authentication Method:');
    const loginMethod = AuthMethodFactory.create('login', config);
    console.log(`   - Type: ${loginMethod.getType()}`);
    console.log(`   - Supports Storage State: ${loginMethod.supportsStorageState()}`);
    console.log(`   - Strategy: API-based login with localStorage`);
    console.log(`   - Login Process: API registration + login, sets token in localStorage`);
    console.log('');

    // Test UI Login method
    console.log('3️⃣ UI Login Authentication Method:');
    const uiLoginMethod = AuthMethodFactory.create('ui-login', config);
    console.log(`   - Type: ${uiLoginMethod.getType()}`);
    console.log(`   - Supports Storage State: ${uiLoginMethod.supportsStorageState()}`);
    console.log(`   - Strategy: Browser UI-based login form`);
    console.log(`   - Login Process: API registration + BROWSER FORM LOGIN (visible email/password entry)`);
    console.log('');

    console.log('🎯 Key Differences:');
    console.log('==================');
    console.log('• JWT: Fastest, uses Playwright storage state, no visible login');
    console.log('• Login: API-based, sets token directly, no visible login');
    console.log('• UI-Login: VISIBLE browser login form, you can see email/password being typed');
    console.log('');

    console.log('📋 Current Configuration:');
    console.log('========================');
    console.log(`AUTH_STRATEGY: ${process.env.AUTH_STRATEGY || 'not set'}`);
    console.log(`DEBUG_AUTH: ${process.env.DEBUG_AUTH || 'false'}`);
    console.log('');

    if (process.env.AUTH_STRATEGY === 'ui-login') {
        console.log('✅ You are currently using UI-Login method!');
        console.log('   When you run tests, you should see:');
        console.log('   1. Browser navigates to /login.html');
        console.log('   2. Email field gets filled with test email');
        console.log('   3. Password field gets filled with test password');
        console.log('   4. Login button gets clicked');
        console.log('   5. Browser navigates to protected page');
    } else if (process.env.AUTH_STRATEGY === 'jwt') {
        console.log('ℹ️ You are using JWT method (fast, no visible login)');
    } else {
        console.log('ℹ️ You are using Login method (API-based, no visible login)');
    }
}

if (require.main === module) {
    compareAuthMethods().catch(console.error);
}

module.exports = { compareAuthMethods };