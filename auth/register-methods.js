/**
 * Register authentication methods with the factory
 * This file should be imported to ensure all authentication methods are available
 */

const { AuthMethodFactory } = require('./factory/auth-method-factory');
const { JWTAuthMethod } = require('./methods/jwt-auth-method');

// Register JWT authentication method
AuthMethodFactory.registerMethod('jwt', JWTAuthMethod);

// Export factory for convenience
module.exports = {
  AuthMethodFactory
};