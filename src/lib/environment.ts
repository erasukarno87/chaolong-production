/**
 * Environment Validation
 * Production-grade environment variable validation
 */

interface EnvironmentConfig {
  required: string[];
  optional: string[];
  defaults: Record<string, string>;
  validators: Record<string, (value: string) => boolean>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  environment: Record<string, string>;
}

class EnvironmentValidator {
  private config: EnvironmentConfig;

  constructor(config: Partial<EnvironmentConfig> = {}) {
    this.config = {
      required: [
        'REACT_APP_API_URL',
        'REACT_APP_SUPABASE_URL',
        'REACT_APP_SUPABASE_ANON_KEY',
      ],
      optional: [
        'REACT_APP_ERROR_ENDPOINT',
        'REACT_APP_SENTRY_DSN',
        'REACT_APP_ANALYTICS_ID',
        'REACT_APP_VERSION',
        'REACT_APP_BUILD_NUMBER',
        'REACT_APP_ENVIRONMENT',
        'REACT_APP_LOG_LEVEL',
        'REACT_APP_CACHE_TTL',
        'REACT_APP_MAX_RETRIES',
      ],
      defaults: {
        'REACT_APP_ENVIRONMENT': 'development',
        'REACT_APP_LOG_LEVEL': 'info',
        'REACT_APP_CACHE_TTL': '300000',
        'REACT_APP_MAX_RETRIES': '3',
        'NODE_ENV': 'development',
      },
      validators: {
        'REACT_APP_API_URL': (value) => this.isValidUrl(value),
        'REACT_APP_SUPABASE_URL': (value) => this.isValidUrl(value),
        'REACT_APP_SUPABASE_ANON_KEY': (value) => value.length > 0,
        'REACT_APP_ERROR_ENDPOINT': (value) => !value || this.isValidUrl(value),
        'REACT_APP_SENTRY_DSN': (value) => !value || this.isValidUrl(value),
        'REACT_APP_LOG_LEVEL': (value) => ['error', 'warn', 'info', 'debug'].includes(value),
        'REACT_APP_CACHE_TTL': (value) => this.isPositiveInteger(value),
        'REACT_APP_MAX_RETRIES': (value) => this.isPositiveInteger(value),
      },
      ...config,
    };
  }

  private isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isPositiveInteger(value: string): boolean {
    const num = parseInt(value, 10);
    return Number.isInteger(num) && num > 0;
  }

  private validateUrl(value: string, name: string): string[] {
    const errors: string[] = [];
    
    if (!value) {
      errors.push(`${name} is required`);
      return errors;
    }

    if (!this.isValidUrl(value)) {
      errors.push(`${name} must be a valid URL`);
    }

    if (value.endsWith('/')) {
      errors.push(`${name} should not end with a slash`);
    }

    return errors;
  }

  private validateKey(value: string, name: string): string[] {
    const errors: string[] = [];
    
    if (!value) {
      errors.push(`${name} is required`);
      return errors;
    }

    if (value.length < 10) {
      errors.push(`${name} appears to be too short`);
    }

    return errors;
  }

  private validateLogLevel(value: string): string[] {
    const errors: string[] = [];
    const validLevels = ['error', 'warn', 'info', 'debug'];
    
    if (!validLevels.includes(value)) {
      errors.push(`LOG_LEVEL must be one of: ${validLevels.join(', ')}`);
    }

    return errors;
  }

  private validateInteger(value: string, name: string, min = 0): string[] {
    const errors: string[] = [];
    const num = parseInt(value, 10);
    
    if (!Number.isInteger(num)) {
      errors.push(`${name} must be an integer`);
      return errors;
    }

    if (num < min) {
      errors.push(`${name} must be at least ${min}`);
    }

    return errors;
  }

  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const environment: Record<string, string> = {};

    // Process required variables
    for (const key of this.config.required) {
      const value = process.env[key] || this.config.defaults[key];
      
      if (!value) {
        errors.push(`Required environment variable ${key} is missing`);
        continue;
      }

      // Custom validation
      if (this.config.validators[key]) {
        if (!this.config.validators[key](value)) {
          errors.push(`Invalid value for ${key}: ${value}`);
          continue;
        }
      }

      // Specific validations
      if (key.includes('URL')) {
        errors.push(...this.validateUrl(value, key));
      } else if (key.includes('KEY') || key.includes('TOKEN')) {
        errors.push(...this.validateKey(value, key));
      }

      environment[key] = value;
    }

    // Process optional variables
    for (const key of this.config.optional) {
      const value = process.env[key] || this.config.defaults[key];
      
      if (!value) {
        continue; // Optional variables can be missing
      }

      // Custom validation
      if (this.config.validators[key]) {
        if (!this.config.validators[key](value)) {
          warnings.push(`Invalid value for optional ${key}: ${value}`);
          continue;
        }
      }

      // Specific validations
      if (key === 'REACT_APP_LOG_LEVEL') {
        warnings.push(...this.validateLogLevel(value));
      } else if (key.includes('TTL') || key.includes('RETRIES')) {
        warnings.push(...this.validateInteger(value, key));
      } else if (key.includes('URL') && value) {
        warnings.push(...this.validateUrl(value, key));
      }

      environment[key] = value;
    }

    // Add defaults
    Object.entries(this.config.defaults).forEach(([key, value]) => {
      if (!environment[key]) {
        environment[key] = value;
      }
    });

    // Environment-specific validations
    const nodeEnv = environment.NODE_ENV || 'development';
    
    if (nodeEnv === 'production') {
      // Production-specific checks
      if (!environment.REACT_APP_ERROR_ENDPOINT) {
        warnings.push('REACT_APP_ERROR_ENDPOINT recommended for production');
      }

      if (!environment.REACT_APP_SENTRY_DSN) {
        warnings.push('REACT_APP_SENTRY_DSN recommended for production error tracking');
      }

      if (environment.REACT_APP_LOG_LEVEL === 'debug') {
        warnings.push('Debug logging not recommended for production');
      }
    } else if (nodeEnv === 'development') {
      // Development-specific checks
      if (environment.REACT_APP_API_URL?.includes('production')) {
        warnings.push('Using production API in development environment');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      environment,
    };
  }

  public getEnvironment(): Record<string, string> {
    const result = this.validate();
    return result.environment;
  }

  public getRequiredEnvVars(): string[] {
    return [...this.config.required];
  }

  public getOptionalEnvVars(): string[] {
    return [...this.config.optional];
  }

  public addRequiredVar(name: string, validator?: (value: string) => boolean): void {
    this.config.required.push(name);
    if (validator) {
      this.config.validators[name] = validator;
    }
  }

  public addOptionalVar(name: string, validator?: (value: string) => boolean): void {
    this.config.optional.push(name);
    if (validator) {
      this.config.validators[name] = validator;
    }
  }

  public setDefault(key: string, value: string): void {
    this.config.defaults[key] = value;
  }
}

// Global validator instance
export const environmentValidator = new EnvironmentValidator();

// Validation functions
export const validateEnvironment = (config?: Partial<EnvironmentConfig>): ValidationResult => {
  const validator = new EnvironmentValidator(config);
  return validator.validate();
};

export const getValidatedEnvironment = (config?: Partial<EnvironmentConfig>): Record<string, string> => {
  const validator = new EnvironmentValidator(config);
  return validator.getEnvironment();
};

// Runtime validation
export const ensureValidEnvironment = (): void => {
  const result = environmentValidator.validate();
  
  if (!result.isValid) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(error => console.error(`  - ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment validation failed in production');
    }
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.log('✅ Environment validation passed');
};

// Type-safe environment access
export const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

export const getEnvVarOptional = (key: string): string | undefined => {
  return process.env[key];
};

// Environment type definitions
export interface Environment {
  // Required
  REACT_APP_API_URL: string;
  REACT_APP_SUPABASE_URL: string;
  REACT_APP_SUPABASE_ANON_KEY: string;
  
  // Optional
  REACT_APP_ERROR_ENDPOINT?: string;
  REACT_APP_SENTRY_DSN?: string;
  REACT_APP_ANALYTICS_ID?: string;
  REACT_APP_VERSION?: string;
  REACT_APP_BUILD_NUMBER?: string;
  REACT_APP_ENVIRONMENT?: string;
  REACT_APP_LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug';
  REACT_APP_CACHE_TTL?: string;
  REACT_APP_MAX_RETRIES?: string;
  
  // Node.js
  NODE_ENV?: 'development' | 'production' | 'test';
}

// Type-safe environment getter
export const getEnvironment = (): Environment => {
  const result = environmentValidator.validate();
  
  if (!result.isValid) {
    throw new Error(`Environment validation failed: ${result.errors.join(', ')}`);
  }

  return result.environment as unknown as Environment;
};

// Export singleton instance
export default environmentValidator;
