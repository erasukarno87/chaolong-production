/**
 * Form-related type definitions
 * Replaces 'any' types with proper TypeScript types
 */

import type { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// FORM DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Step1FormData {
  workOrderNo: string;
  shift: 'PAGI' | 'SIANG' | 'MALAM' | '';
  lineId: string;
  groupId: string;
  productId: string;
  quantity: string;
}

export interface Step2FormData {
  operators: OperatorAssignment[];
  workstations: WorkstationAssignment[];
  startTime: string;
  endTime: string;
}

export interface OperatorAssignment {
  id: string;
  operatorId: string;
  workstationId: string;
  role: 'leader' | 'operator' | 'helper';
  skillLevel: number;
}

export interface WorkstationAssignment {
  id: string;
  workstationId: string;
  processId: string;
  operatorIds: string[];
  status: 'active' | 'inactive' | 'maintenance';
}

export interface Step3FormData {
  checkItems: CheckItemResult[];
  completedAt: string | null;
  notes: string;
}

export interface CheckItemResult {
  id: string;
  checkItemId: string;
  status: 'pending' | 'pass' | 'fail' | 'na';
  measuredValue?: number;
  note?: string;
  photoUrls?: string[];
}

export interface Step4FormData {
  confirmation: boolean;
  signature: string | null;
  notes: string;
  submittedAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'range' | 'custom';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export type ValidatorFunction<T> = (value: T) => ValidationResult;

// ═══════════════════════════════════════════════════════════════════════════════
// FORM EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FormChangeEvent<T = unknown> {
  field: string;
  value: T;
  previousValue: T;
}

export interface FormSubmitEvent<T = unknown> {
  data: T;
  isValid: boolean;
  errors: ValidationError[];
}

export type FormChangeHandler<T = unknown> = (event: FormChangeEvent<T>) => void;
export type FormSubmitHandler<T = unknown> = (event: FormSubmitEvent<T>) => void | Promise<void>;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PROP TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BaseFormProps<T = unknown> {
  data: T;
  onChange: FormChangeHandler<T>;
  onSubmit?: FormSubmitHandler<T>;
  disabled?: boolean;
  loading?: boolean;
  errors?: ValidationError[];
  className?: string;
  children?: ReactNode;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  description?: string;
}

export interface InputFieldProps {
  name: string;
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number' | 'email' | 'password' | 'tel';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

export interface SelectFieldProps<T = string> {
  name: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER & SEARCH TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FilterCriteria {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: string | number | boolean | (string | number)[];
}

export interface SortCriteria {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchParams {
  query: string;
  filters: FilterCriteria[];
  sort: SortCriteria[];
  page: number;
  pageSize: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE & LIST TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TableColumn<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface TableRow<T = unknown> {
  id: string;
  data: T;
  selected?: boolean;
  disabled?: boolean;
}

export interface TableProps<T = unknown> {
  columns: TableColumn<T>[];
  rows: TableRow<T>[];
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  onRowClick?: (row: TableRow<T>) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: FilterCriteria[]) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL & DIALOG TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export interface DialogAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'primary' | 'destructive' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type AsyncFunction<T = void> = () => Promise<T>;
export type CallbackFunction<T = void> = (value: T) => void;
