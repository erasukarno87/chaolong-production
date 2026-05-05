import { z } from 'zod';

/**
 * Environment variable schema for the application.
 * All environment variables are validated at runtime to prevent
 * configuration errors in production.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'Supabase key is required'),
});

type Environment = z.infer<typeof envSchema>;

/**
 * Validated environment variables.
 * Access these instead of import.meta.env directly.
 */
export const env: Environment = envSchema.parse(import.meta.env);

/**
 * Validate environment on module load.
 * This ensures the app fails fast if configuration is invalid.
 */
if (typeof window !== 'undefined') {
  try {
    envSchema.parse(import.meta.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid environment configuration:', error.errors);
      throw new Error('Application configuration is invalid. Please check environment variables.');
    }
  }
}
