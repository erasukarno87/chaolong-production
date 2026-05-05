/**
 * 
 * 
 * 
 * 
 * 
 * Comprehensive Validation Hook
 * Production-grade validation and error handling untuk Input Laporan
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";

// Types untuk validation
interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'select' | 'multiselect';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

interface ValidationSchema {
  [key: string]: ValidationRule[];
}

interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Comprehensive validation hook dengan production-grade error handling
 */
export function useValidation(schema: ValidationSchema) {
  const [formState, setFormState] = useState<FormState>({
    values: {},
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: false
  });

  // Validate single field
  const validateField = useCallback((field: string, value: any): string | null => {
    const rules = schema[field];
    if (!rules) return null;

    for (const rule of rules) {
      // Required validation
      if (rule.required && (!value || value === '')) {
        return rule.message || `${field} is required`;
      }

      // Skip other validations if field is empty and not required
      if (!value || value === '') continue;

      // Type validation
      if (rule.type) {
        switch (rule.type) {
          case 'string':
            if (typeof value !== 'string') {
              return rule.message || `${field} must be a string`;
            }
            break;
          case 'number': {
            const numValue = Number(value);
            if (isNaN(numValue)) {
              return rule.message || `${field} must be a number`;
            }
            value = numValue;
            break;
          }
          case 'email': {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value)) {
              return rule.message || `${field} must be a valid email`;
            }
            break;
          }
          case 'phone': {
            const phonePattern = /^[\d\s\- +()]+$/;
            if (!phonePattern.test(value)) {
              return rule.message || `${field} must be a valid phone number`;
            }
            break;
          }
          case 'select':
            if (Array.isArray(value) && value.length === 0) {
              return rule.message || `Please select at least one option`;
            }
            break;
          case 'multiselect':
            if (!Array.isArray(value) || value.length === 0) {
              return rule.message || `Please select at least one option`;
            }
            break;
        }
      }

      // Length validation
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          return rule.message || `${field} must be at least ${rule.minLength} characters`;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          return rule.message || `${field} must not exceed ${rule.maxLength} characters`;
        }
      }

      // Range validation
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          return rule.message || `${field} must be at least ${rule.min}`;
        }
        if (rule.max !== undefined && value > rule.max) {
          return rule.message || `${field} must not exceed ${rule.max}`;
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          return rule.message || `${field} format is invalid`;
        }
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value);
        if (customError) {
          return customError;
        }
      }
    }

    return null;
  }, [schema]);

  // Validate entire form
  const validateForm = useCallback((values: Record<string, any>): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // Validate each field
    for (const field in schema) {
      const value = values[field];
      const error = validateField(field, value);
      
      if (error) {
        errors.push({
          field,
          message: error,
          type: 'error'
        });
      }
    }

    // Cross-field validation
    const crossValidationErrors = performCrossFieldValidation(values);
    errors.push(...crossValidationErrors);

    // Business logic validation
    const businessWarnings = performBusinessLogicValidation(values);
    warnings.push(...businessWarnings);

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      info
    };
  }, [schema, validateField]);

  // Cross-field validation
  const performCrossFieldValidation = (values: Record<string, any>): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Example: Target vs actual validation
    if (values.target && values.actual) {
      if (values.actual > values.target * 1.5) {
        errors.push({
          field: 'actual',
          message: 'Actual production exceeds target by more than 50%. Please verify.',
          type: 'warning'
        });
      }
    }

    // Example: Time range validation
    if (values.startTime && values.endTime) {
      const start = new Date(`2000-01-01 ${values.startTime}`);
      const end = new Date(`2000-01-01 ${values.endTime}`);
      
      if (end <= start) {
        errors.push({
          field: 'endTime',
          message: 'End time must be after start time',
          type: 'error'
        });
      }
    }

    // Example: Operator skill validation
    if (values.operators && values.processes) {
      const operatorsWithoutSkills = values.operators.filter((op: any) => !op.skills || op.skills.length === 0);
      if (operatorsWithoutSkills.length > 0) {
        errors.push({
          field: 'operators',
          message: `${operatorsWithoutSkills.length} operators without required skills assigned`,
          type: 'warning'
        });
      }
    }

    return errors;
  };

  // Business logic validation
  const performBusinessLogicValidation = (values: Record<string, any>): ValidationError[] => {
    const warnings: ValidationError[] = [];

    // Production efficiency warnings
    if (values.target && values.hourlyTarget) {
      const totalHours = 8; // Standard shift
      const expectedOutput = values.hourlyTarget * totalHours;
      
      if (values.target > expectedOutput * 1.2) {
        warnings.push({
          field: 'target',
          message: 'Target seems high compared to hourly rate. Consider adjusting.',
          type: 'warning'
        });
      }
    }

    // Downtime warnings
    if (values.downtimeMinutes && values.target) {
      const downtimePercentage = (values.downtimeMinutes / 480) * 100; // 8 hours = 480 minutes
      
      if (downtimePercentage > 20) {
        warnings.push({
          field: 'downtimeMinutes',
          message: `High downtime detected: ${downtimePercentage.toFixed(1)}% of shift time`,
          type: 'warning'
        });
      }
    }

    // Quality warnings
    if (values.actual && values.ng) {
      const ngRate = (values.ng / values.actual) * 100;
      
      if (ngRate > 10) {
        warnings.push({
          field: 'ng',
          message: `High NG rate: ${ngRate.toFixed(1)}%. Consider quality check.`,
          type: 'warning'
        });
      }
    }

    return warnings;
  };

  // Update field value
  const setFieldValue = useCallback((field: string, value: any) => {
    setFormState(prev => {
      const newValues = { ...prev.values, [field]: value };
      const error = validateField(field, value);
      const newErrors = { ...prev.errors, [field]: error || '' };
      const newTouched = { ...prev.touched, [field]: true };
      
      // Check if form is valid
      const validation = validateForm(newValues);
      
      return {
        ...prev,
        values: newValues,
        errors: newErrors,
        touched: newTouched,
        isValid: validation.isValid
      };
    });
  }, [validateField, validateForm]);

  // Set multiple field values
  const setFieldValues = useCallback((values: Record<string, any>) => {
    setFormState(prev => {
      const newValues = { ...prev.values, ...values };
      const validation = validateForm(newValues);
      const newErrors: Record<string, string> = {};
      
      // Update errors for all fields
      for (const field in values) {
        const error = validateField(field, values[field]);
        newErrors[field] = error || '';
      }
      
      return {
        ...prev,
        values: newValues,
        errors: { ...prev.errors, ...newErrors },
        touched: { ...prev.touched, ...Object.keys(values).reduce((acc, field) => ({ ...acc, [field]: true }), {}) },
        isValid: validation.isValid
      };
    });
  }, [validateField, validateForm]);

  // Clear field error
  const clearFieldError = useCallback((field: string) => {
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: '' }
    }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      errors: {}
    }));
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setFormState({
      values: {},
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: false
    });
  }, []);

  // Submit form
  const submitForm = useCallback(async (onSubmit?: (values: Record<string, any>) => Promise<void>) => {
    const validation = validateForm(formState.values);
    
    if (!validation.isValid) {
      // Show error messages
      validation.errors.forEach(error => {
        toast.error(error.message);
      });
      
      // Show warnings
      validation.warnings.forEach(warning => {
        toast.warning(warning.message);
      });
      
      return false;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      if (onSubmit) {
        await onSubmit(formState.values);
      }
      
      toast.success('Form submitted successfully!');
      return true;
    } catch {
      toast.error('Failed to submit form. Please try again.');
      return false;
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formState.values, validateForm]);

  // Get field error
  const getFieldError = useCallback((field: string) => {
    return formState.errors[field] || '';
  }, [formState.errors]);

  // Check if field has error
  const hasFieldError = useCallback((field: string) => {
    return !!formState.errors[field];
  }, [formState.errors]);

  // Check if field is touched
  const isFieldTouched = useCallback((field: string) => {
    return formState.touched[field] || false;
  }, [formState.touched]);

  // Computed values
  const hasErrors = useMemo(() => {
    return Object.values(formState.errors).some(error => error.length > 0);
  }, [formState.errors]);

  const touchedCount = useMemo(() => {
    return Object.values(formState.touched).filter(Boolean).length;
  }, [formState.touched]);

  return {
    // State
    formState,
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isSubmitting: formState.isSubmitting,
    isValid: formState.isValid,
    hasErrors,
    touchedCount,
    
    // Actions
    setFieldValue,
    setFieldValues,
    clearFieldError,
    clearErrors,
    resetForm,
    submitForm,
    
    // Helpers
    validateField,
    validateForm,
    getFieldError,
    hasFieldError,
    isFieldTouched,
  };
}

/**
 * Pre-defined validation schemas for Input Laporan
 */
export const inputLaporanSchemas: Record<string, ValidationSchema> = {
  setup: {
    lineId: [
      { required: true, message: 'Line produksi harus dipilih' }
    ],
    productId: [
      { required: true, message: 'Produk harus dipilih' }
    ],
    target: [
      { required: true, type: 'number', min: 1, max: 10000, message: 'Target harus antara 1-10,000' }
    ],
    hourlyTarget: [
      { required: true, type: 'number', min: 1, max: 1000, message: 'Target per jam harus antara 1-1,000' }
    ],
    shiftId: [
      { required: true, message: 'Shift harus dipilih' }
    ],
    date: [
      { required: true, message: 'Tanggal harus dipilih' }
    ]
  },
  
  output: {
    actual: [
      { required: true, type: 'number', min: 0, message: 'Actual harus >= 0' }
    ],
    ng: [
      { required: true, type: 'number', min: 0, message: 'NG harus >= 0' }
    ],
    downtime: [
      { required: true, type: 'number', min: 0, max: 480, message: 'Downtime harus antara 0-480 menit' }
    ],
    note: [
      { maxLength: 500, message: 'Catatan maksimal 500 karakter' }
    ]
  },
  
  ng: {
    categoryId: [
      { required: true, message: 'Kategori NG harus dipilih' }
    ],
    quantity: [
      { required: true, type: 'number', min: 1, message: 'Quantity harus >= 1' }
    ],
    description: [
      { maxLength: 200, message: 'Deskripsi maksimal 200 karakter' }
    ]
  },
  
  downtime: {
    categoryId: [
      { required: true, message: 'Kategori downtime harus dipilih' }
    ],
    duration: [
      { required: true, type: 'number', min: 1, max: 480, message: 'Durasi harus antara 1-480 menit' }
    ],
    startTime: [
      { required: true, message: 'Waktu mulai harus diisi' }
    ],
    endTime: [
      { required: true, message: 'Waktu selesai harus diisi' }
    ],
    rootCause: [
      { maxLength: 300, message: 'Root cause maksimal 300 karakter' }
    ],
    actionTaken: [
      { maxLength: 300, message: 'Action taken maksimal 300 karakter' }
    ]
  },
  
  operator: {
    operatorId: [
      { required: true, message: 'Operator harus dipilih' }
    ],
    positionId: [
      { required: true, message: 'Posisi harus dipilih' }
    ],
    skillLevel: [
      { required: true, type: 'number', min: 0, max: 4, message: 'Skill level harus antara 0-4' }
    ]
  }
};

/**
 * Real-time validation hook
 */
export function useRealTimeValidation<T extends Record<string, any>>(
  values: T,
  schema: ValidationSchema,
  debounceMs: number = 300
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(true);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    for (const field in schema) {
      const value = values[field];
      const rules = schema[field];

      for (const rule of rules) {
        if (rule.required && (!value || value === '')) {
          newErrors[field] = rule.message || `${field} is required`;
          valid = false;
          break;
        }

        if (value && rule.type === 'number' && isNaN(Number(value))) {
          newErrors[field] = rule.message || `${field} must be a number`;
          valid = false;
          break;
        }

        if (value && rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
          newErrors[field] = rule.message || `${field} must be at least ${rule.minLength} characters`;
          valid = false;
          break;
        }

        if (value && rule.custom) {
          const customError = rule.custom(value);
          if (customError) {
            newErrors[field] = customError;
            valid = false;
            break;
          }
        }
      }
    }

    setErrors(newErrors);
    setIsValid(valid);
  }, [values, schema]);

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(validate, debounceMs);
    return () => clearTimeout(timer);
  }, [values, validate, debounceMs]);

  return {
    errors,
    isValid,
    validate
  };
}

/**
 * Async validation hook
 */
export function useAsyncValidation<T>(
  validator: (value: T) => Promise<string | null>,
  debounceMs: number = 500
) {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  const validate = useCallback(async (value: T) => {
    setIsValidating(true);
    setError(null);
    
    try {
      const validationError = await validator(value);
      setError(validationError);
      setIsValid(!validationError);
      return !validationError;
    } catch {
      setError('Validation failed');
      setIsValid(false);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [validator]);

  // Debounced validation
  const debouncedValidate = useCallback(
    debounce((value: T) => validate(value), debounceMs),
    [validate, debounceMs]
  );

  return {
    isValidating,
    error,
    isValid,
    validate: debouncedValidate
  };
}

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}
