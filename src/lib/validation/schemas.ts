/**
 * Data Validation Schemas
 * Production-grade runtime validation with Zod
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const baseStringSchema = z.string().min(1, "Required field");
export const optionalStringSchema = z.string().optional();
export const numericSchema = z.number();
export const numericFromStringSchema = z.string().transform((val) => {
  const num = Number(val);
  if (isNaN(num)) {
    throw new Error(`Invalid number: ${val}`);
  }
  return num;
});
export const booleanSchema = z.boolean();
export const dateSchema = z.string().datetime().or(z.date());
export const uuidSchema = z.string().uuid();

// ============================================================================
// MONITORING DOMAIN SCHEMAS
// ============================================================================

// Production Run Schema
export const productionRunSchema = z.object({
  id: uuidSchema,
  target_qty: numericSchema.min(0, "Target quantity must be positive"),
  hourly_target: numericSchema.min(0, "Hourly target must be positive"),
  started_at: dateSchema,
  ended_at: dateSchema.optional(),
  line_id: optionalStringSchema,
  product_id: optionalStringSchema,
  shift_id: optionalStringSchema,
  status: z.enum(["active", "completed", "paused", "cancelled"]),
  created_at: dateSchema,
  updated_at: dateSchema,
});

// Line Schema
export const lineSchema = z.object({
  id: uuidSchema,
  code: baseStringSchema.max(50, "Line code too long"),
  name: baseStringSchema.max(100, "Line name too long"),
  description: optionalStringSchema,
  is_active: booleanSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

// Product Schema
export const productSchema = z.object({
  id: uuidSchema,
  model: baseStringSchema.max(100, "Product model too long"),
  name: baseStringSchema.max(200, "Product name too long"),
  description: optionalStringSchema,
  category: optionalStringSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

// Shift Schema
export const shiftSchema = z.object({
  id: uuidSchema,
  name: baseStringSchema.max(50, "Shift name too long"),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  is_active: booleanSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

// ============================================================================
// HOURLY DATA SCHEMAS
// ============================================================================

export const hourlyOutputSchema = z.object({
  id: uuidSchema,
  run_id: uuidSchema,
  hour_label: baseStringSchema.max(20, "Hour label too long"),
  actual_qty: numericSchema.min(0, "Actual quantity must be non-negative"),
  ng_qty: numericSchema.min(0, "NG quantity must be non-negative"),
  target_qty: numericSchema.min(0, "Target quantity must be non-negative"),
  is_break: booleanSchema,
  note: optionalStringSchema.max(500, "Note too long"),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const hourlyOutputArraySchema = z.array(hourlyOutputSchema);

// ============================================================================
// QUALITY DATA SCHEMAS
// ============================================================================

export const defectCategorySchema = z.object({
  id: uuidSchema,
  name: baseStringSchema.max(100, "Defect name too long"),
  code: baseStringSchema.max(20, "Defect code too long"),
  description: optionalStringSchema,
  severity: z.enum(["low", "medium", "high", "critical"]),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const ngAggregationSchema = z.object({
  id: uuidSchema,
  run_id: uuidSchema,
  defect_id: uuidSchema,
  defect_name: baseStringSchema.max(100, "Defect name too long"),
  defect_code: baseStringSchema.max(20, "Defect code too long"),
  total_qty: numericSchema.min(0, "Total quantity must be non-negative"),
  pct: numericSchema.min(0).max(100, "Percentage must be between 0 and 100"),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const ngAggregationArraySchema = z.array(ngAggregationSchema);

// ============================================================================
// DOWNTIME DATA SCHEMAS
// ============================================================================

export const downtimeCategorySchema = z.object({
  id: uuidSchema,
  name: baseStringSchema.max(100, "Category name too long"),
  code: baseStringSchema.max(20, "Category code too long"),
  description: optionalStringSchema,
  is_planned: booleanSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const downtimeAggregationSchema = z.object({
  id: uuidSchema,
  run_id: uuidSchema,
  category_id: uuidSchema,
  category_name: baseStringSchema.max(100, "Category name too long"),
  category_code: baseStringSchema.max(20, "Category code too long"),
  total_min: numericSchema.min(0, "Total minutes must be non-negative"),
  pct: numericSchema.min(0).max(100, "Percentage must be between 0 and 100"),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const downtimeRawSchema = z.object({
  id: uuidSchema,
  run_id: uuidSchema,
  category_id: uuidSchema,
  started_at: dateSchema,
  ended_at: dateSchema.optional(),
  duration_minutes: numericSchema.min(0, "Duration must be non-negative"),
  kind: z.enum(["planned", "unplanned"]),
  root_cause: optionalStringSchema.max(500, "Root cause too long"),
  action_taken: optionalStringSchema.max(500, "Action taken too long"),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const downtimeAggregationArraySchema = z.array(downtimeAggregationSchema);
export const downtimeRawArraySchema = z.array(downtimeRawSchema);

// ============================================================================
// CHECK SHEET SCHEMAS
// ============================================================================

export const checkSheetTemplateSchema = z.object({
  id: uuidSchema,
  kind: z.enum(["5F5L", "AUTONOMOUS"]),
  label: baseStringSchema.max(200, "Label too long"),
  description: optionalStringSchema,
  sort_order: numericSchema.min(0, "Sort order must be non-negative"),
  is_active: booleanSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const checkSheetResultSchema = z.object({
  id: uuidSchema,
  run_id: uuidSchema,
  template_id: uuidSchema,
  checked_at: dateSchema,
  passed: booleanSchema,
  notes: optionalStringSchema.max(1000, "Notes too long"),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const checkSheetResultArraySchema = z.array(checkSheetResultSchema);

// ============================================================================
// SKILL MATRIX SCHEMAS
// ============================================================================

export const processSchema = z.object({
  id: uuidSchema,
  name: baseStringSchema.max(100, "Process name too long"),
  description: optionalStringSchema,
  is_active: booleanSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const skillSchema = z.object({
  id: uuidSchema,
  operator_id: uuidSchema,
  process_id: uuidSchema,
  process_name: baseStringSchema.max(100, "Process name too long"),
  level: numericSchema.min(0).max(4, "Skill level must be between 0 and 4"),
  wi_pass: booleanSchema,
  assessed_at: dateSchema.optional(),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const operatorSchema = z.object({
  id: uuidSchema,
  full_name: baseStringSchema.max(200, "Operator name too long"),
  initials: baseStringSchema.max(10, "Initials too long"),
  join_date: dateSchema,
  assigned_line_ids: z.array(uuidSchema),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const skillRowSchema = z.object({
  operator_id: uuidSchema,
  full_name: baseStringSchema.max(200, "Operator name too long"),
  initials: baseStringSchema.max(10, "Initials too long"),
  join_date: dateSchema,
  assigned_line_ids: z.array(uuidSchema),
  skills: z.array(skillSchema),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const skillRowArraySchema = z.array(skillRowSchema);

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

export const apiResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  data: dataSchema,
  success: booleanSchema,
  message: optionalStringSchema,
  timestamp: dateSchema,
});

export const paginatedResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  data: z.array(dataSchema),
  pagination: z.object({
    page: numericSchema.min(1),
    limit: numericSchema.min(1).max(100),
    total: numericSchema.min(0),
    totalPages: numericSchema.min(0),
  }),
  success: booleanSchema,
  message: optionalStringSchema,
  timestamp: dateSchema,
});

// ============================================================================
// FORM SCHEMAS
// ============================================================================

export const createRunFormSchema = z.object({
  target_qty: numericSchema.min(1, "Target quantity is required"),
  hourly_target: numericSchema.min(1, "Hourly target is required"),
  line_id: uuidSchema,
  product_id: uuidSchema,
  shift_id: uuidSchema,
});

export const updateRunFormSchema = z.object({
  target_qty: numericSchema.min(0).optional(),
  hourly_target: numericSchema.min(0).optional(),
  status: z.enum(["active", "completed", "paused", "cancelled"]).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export const checkSheetFormSchema = z.object({
  template_id: uuidSchema,
  passed: booleanSchema,
  notes: optionalStringSchema.max(1000),
});

export const downtimeFormSchema = z.object({
  category_id: uuidSchema,
  started_at: dateSchema,
  ended_at: dateSchema.optional(),
  kind: z.enum(["planned", "unplanned"]),
  root_cause: optionalStringSchema.max(500),
  action_taken: optionalStringSchema.max(500),
});

export const skillFormSchema = z.object({
  operator_id: uuidSchema,
  process_id: uuidSchema,
  level: numericSchema.min(0).max(4),
  wi_pass: booleanSchema,
});

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export class ValidationError extends Error {
  public readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export const validateData = <T>(schema: z.ZodType<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `Validation failed: ${error.issues.map(i => i.message).join(', ')}`,
        error.issues
      );
    }
    throw error;
  }
};

export const validateDataSafe = <T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: ValidationError } => {
  try {
    const parsedData = schema.parse(data);
    return { success: true, data: parsedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new ValidationError(
        `Validation failed: ${error.issues.map(i => i.message).join(', ')}`,
        error.issues
      );
      return { success: false, error: validationError };
    }
    throw error;
  }
};

export const validateArray = <T>(schema: z.ZodType<T>, data: unknown[]): T[] => {
  return data.map(item => validateData(schema, item));
};

export const validateArraySafe = <T>(schema: z.ZodType<T>, data: unknown[]): { success: T[]; errors: ValidationError[] } => {
  const results = data.map(item => validateDataSafe(schema, item));
  const success = results.filter(r => r.success) as { success: true; data: T }[];
  const errors = results.filter(r => !r.success) as { success: false; error: ValidationError }[];
  
  return {
    success: success.map(s => s.data),
    errors: errors.map(e => e.error),
  };
};

// ============================================================================
// MIDDLEWARE SCHEMAS
// ============================================================================

export const requestHeadersSchema = z.object({
  'content-type': z.string().optional(),
  'authorization': z.string().optional(),
  'x-api-key': z.string().optional(),
  'x-request-id': uuidSchema.optional(),
});

export const responseHeadersSchema = z.object({
  'content-type': z.string(),
  'x-request-id': uuidSchema.optional(),
  'x-response-time': numericSchema.optional(),
});

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const schemas = {
  // Base
  baseString: baseStringSchema,
  optionalString: optionalStringSchema,
  numeric: numericSchema,
  boolean: booleanSchema,
  date: dateSchema,
  uuid: uuidSchema,
  
  // Domain
  productionRun: productionRunSchema,
  line: lineSchema,
  product: productSchema,
  shift: shiftSchema,
  
  // Data
  hourlyOutput: hourlyOutputSchema,
  hourlyOutputArray: hourlyOutputArraySchema,
  ngAggregation: ngAggregationSchema,
  ngAggregationArray: ngAggregationArraySchema,
  downtimeAggregation: downtimeAggregationSchema,
  downtimeRaw: downtimeRawSchema,
  downtimeAggregationArray: downtimeAggregationArraySchema,
  downtimeRawArray: downtimeRawArraySchema,
  checkSheetResult: checkSheetResultSchema,
  checkSheetResultArray: checkSheetResultArraySchema,
  skillRow: skillRowSchema,
  skillRowArray: skillRowArraySchema,
  
  // API
  apiResponse: apiResponseSchema,
  paginatedResponse: paginatedResponseSchema,
  
  // Forms
  createRunForm: createRunFormSchema,
  updateRunForm: updateRunFormSchema,
  checkSheetForm: checkSheetFormSchema,
  downtimeForm: downtimeFormSchema,
  skillForm: skillFormSchema,
  
  // Middleware
  requestHeaders: requestHeadersSchema,
  responseHeaders: responseHeadersSchema,
} as const;

export type SchemaKeys = keyof typeof schemas;
