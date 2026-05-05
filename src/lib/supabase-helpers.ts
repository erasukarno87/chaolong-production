/**
 * Typed Supabase Query Helpers
 * 
 * This module provides type-safe wrappers for Supabase queries on tables
 * that are not yet in the generated types.ts file.
 * 
 * Usage:
 *   const groups = await queryTable<Group>('groups', '*', { line_id: lineId });
 *   const leader = await insertRow<GroupLeader>('group_leaders', { group_id, user_id });
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface Group {
  id: string;
  line_id: string;
  code: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GroupLeader {
  id: string;
  group_id: string;
  user_id: string;
  created_at?: string;
}

export interface GroupProcessAssignment {
  id: string;
  group_id: string;
  process_id: string;
  operator_id: string;
  created_at?: string;
}

export interface ProductLine {
  id: string;
  line_id: string;
  product_id: string;
  created_at?: string;
}

export interface OperatorLineAssignment {
  id: string;
  operator_id: string;
  line_id: string;
  created_at?: string;
}

export interface OperatorProcessAssignment {
  id: string;
  operator_id: string;
  process_id: string;
  created_at?: string;
}

export interface ProcessSkillRequirement {
  id: string;
  process_id: string;
  skill_id: string;
  min_level: number;
  created_at?: string;
}

export interface ShiftBreak {
  id: string;
  shift_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  created_at?: string;
}

export interface FiveFiveLCheckItem {
  id: string;
  line_id: string;
  sort_group: string;
  sort_order: number;
  label: string;
  input_type: string;
  created_at?: string;
}

export interface AutonomousCheckItem {
  id: string;
  line_id: string;
  code: string;
  name: string;
  frequency: string;
  category: string;
  created_at?: string;
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Query a table with type safety
 * 
 * @example
 * const groups = await queryTable<Group>('groups', '*', { line_id: 'abc' });
 */
export async function queryTable<T>(
  table: string,
  select: string = '*',
  filters?: Record<string, unknown>,
  options?: {
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
  }
): Promise<T[]> {
  let query = supabase.from(table).select(select);

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  // Apply ordering
  if (options?.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  }

  // Apply limit
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return (data ?? []) as T[];
}

/**
 * Query a single row with type safety
 */
export async function querySingle<T>(
  table: string,
  select: string = '*',
  filters: Record<string, unknown>
): Promise<T | null> {
  let query = supabase.from(table).select(select);

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { data, error } = await query.maybeSingle();
  
  if (error) throw error;
  return data as T | null;
}

/**
 * Insert a row with type safety
 */
export async function insertRow<T>(
  table: string,
  data: Omit<T, 'id' | 'created_at' | 'updated_at'>
): Promise<T> {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result as T;
}

/**
 * Update a row with type safety
 */
export async function updateRow<T>(
  table: string,
  id: string,
  data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>
): Promise<T> {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return result as T;
}

/**
 * Upsert a row with type safety
 */
export async function upsertRow<T>(
  table: string,
  data: Partial<T>,
  conflictColumns?: string[]
): Promise<T> {
  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, conflictColumns ? { onConflict: conflictColumns.join(',') } : undefined)
    .select()
    .single();
  
  if (error) throw error;
  return result as T;
}

/**
 * Delete a row with type safety
 */
export async function deleteRow(
  table: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

/**
 * Delete rows matching filters
 */
export async function deleteRows(
  table: string,
  filters: Record<string, unknown>
): Promise<void> {
  let query = supabase.from(table).delete();

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { error } = await query;
  
  if (error) throw error;
}

// ─── Specialized Queries ──────────────────────────────────────────────────────

/**
 * Get groups for a specific line
 */
export async function getGroupsByLine(lineId: string): Promise<Group[]> {
  return queryTable<Group>('groups', '*', { line_id: lineId, active: true }, {
    orderBy: 'sort_order',
    ascending: true
  });
}

/**
 * Get leaders for a specific group
 */
export async function getGroupLeaders(groupId: string) {
  const { data, error } = await supabase
    .from('group_leaders')
    .select(`
      id,
      user_id,
      profiles(user_id, display_name, email)
    `)
    .eq('group_id', groupId);
  
  if (error) throw error;
  return data ?? [];
}

/**
 * Get process assignments for a group
 */
export async function getGroupProcessAssignments(groupId: string) {
  const { data, error } = await supabase
    .from('group_process_assignments')
    .select(`
      id,
      process_id,
      operator_id,
      processes(id, code, name, sort_order),
      operators(id, full_name, employee_code, initials, avatar_color)
    `)
    .eq('group_id', groupId);
  
  if (error) throw error;
  return data ?? [];
}

/**
 * Get products for a specific line
 */
export async function getLineProducts(lineId: string) {
  const { data, error } = await supabase
    .from('product_lines')
    .select('product_id, products(id, code, name, model)')
    .eq('line_id', lineId);
  
  if (error) throw error;
  return (data ?? []).map((lp: any) => ({
    id: lp.product_id,
    ...lp.products,
  }));
}

/**
 * Get operators assigned to a line
 */
export async function getLineOperators(lineId: string) {
  const { data, error } = await supabase
    .from('operator_line_assignments')
    .select('operator_id, operators(id, full_name, initials, employee_code, avatar_color, position)')
    .eq('line_id', lineId);
  
  if (error) throw error;
  return data ?? [];
}

/**
 * Get skill requirements for a process
 */
export async function getProcessSkillRequirements(processId: string): Promise<ProcessSkillRequirement[]> {
  return queryTable<ProcessSkillRequirement>(
    'process_skill_requirements',
    '*',
    { process_id: processId }
  );
}

