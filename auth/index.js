/**
 * Authentication module exports
 * Provides centralized access to all authentication interfaces, factories, and error classes
 */

// Core interfaces
const { AuthMethod } = require('./interfaces/auth-method.interface');

// Authentication methods
const { JWTAuthMethod } = require('./methods/jwt-auth-method');
const { LoginAuthMethod } = require('./methods/login-auth-method');
const { UILoginAuthMethod } = require('./methods/ui-login-auth-method');
const { FallbackAuthMethod } = require('./methods/fallback-auth-method');

// Factory
const { AuthMethodFactory } = require('./factory/auth-method-factory');

// Auto-register authentication methods
AuthMethodFactory.registerMethod('jwt', JWTAuthMethod);
AuthMethodFactory.registerMethod('login', LoginAuthMethod);
AuthMethodFactory.registerMethod('ui-login', UILoginAuthMethod);

// Error classes
const {
  AuthenticationError,
  JWTAuthenticationError,
  TokenValidationError,
  TokenExpiredError,
  InvalidTokenError,
  LoginAuthenticationError,
  InvalidCredentialsError,
  UserRegistrationError,
  NetworkAuthenticationError,
  AuthenticationTimeoutError,
  ConfigurationError,
  StorageStateError,
  BrowserContextError,
  RetryExhaustedError,
  AuthErrorHandler
} = require('./errors/authentication-errors');

module.exports = {
  // Core interfaces
  AuthMethod,
  
  // Authentication methods
  JWTAuthMethod,
  LoginAuthMethod,
  UILoginAuthMethod,
  FallbackAuthMethod,
  
  // Factory
  AuthMethodFactory,
  
  // Error classes
  AuthenticationError,
  JWTAuthenticationError,
  TokenValidationError,
  TokenExpiredError,
  InvalidTokenError,
  LoginAuthenticationError,
  InvalidCredentialsError,
  UserRegistrationError,
  NetworkAuthenticationError,
  AuthenticationTimeoutError,
  ConfigurationError,
  StorageStateError,
  BrowserContextError,
  RetryExhaustedError,
  
  // Utilities
  AuthErrorHandler
};