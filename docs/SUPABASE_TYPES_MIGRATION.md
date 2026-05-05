# Supabase Types Migration Guide

## Overview

This guide explains how to regenerate Supabase types and migrate from `as any` casts to type-safe queries.

## Current State

### Missing Tables in types.ts

The following tables are used in the codebase but missing from `types.ts`:

| Table | Used In | Impact |
|-------|---------|--------|
| `groups` | GroupsTab, useShiftSetupData | High |
| `group_leaders` | GroupCard, useShiftSetupData | High |
| `group_process_assignments` | GroupCard, useShiftSetupData | High |
| `product_lines` | ProductsTab, useShiftSetupData | High |
| `operator_line_assignments` | useShiftSetupData | High |
| `operator_process_assignments` | useShiftSetupData | High |
| `process_skill_requirements` | SkillsTab, SkillMatrixTab | High |
| `shift_breaks` | ShiftsTab, useShiftRun | Medium |
| `fivef5l_check_items` | FiveFiveLTab | Medium |
| `autonomous_check_items` | AutonomousTab | Medium |
| `ref_*` tables | Multiple admin tabs | Medium |

### Files with `as any` Casts

**High Priority (30+ occurrences):**
- `src/hooks/useCrud.ts` (3 casts)
- `src/features/input/hooks/useShiftSetupData.ts` (15+ casts)
- `src/components/admin/*.tsx` (20+ casts)

## Step 1: Regenerate Types

### Option A: Using Script (Recommended)

**Windows (PowerShell):**
```powershell
.\scripts\regenerate-types.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/regenerate-types.sh
./scripts/regenerate-types.sh
```

### Option B: Manual

```bash
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project
supabase link --project-ref <your-project-ref>

# 4. Generate types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Step 2: Verify Generated Types

### Check for Missing Tables

```typescript
// Open src/integrations/supabase/types.ts
// Search for each table name:

// Should find:
export interface Database {
  public: {
    Tables: {
      groups: { ... }
      group_leaders: { ... }
      product_lines: { ... }
      // etc.
    }
  }
}
```

### Verify Table Structure

```typescript
// Example: groups table should have:
groups: {
  Row: {
    id: string
    line_id: string
    code: string
    sort_order: number
    active: boolean
    created_at: string
    updated_at: string
  }
  Insert: { ... }
  Update: { ... }
}
```

## Step 3: Migrate to Type-Safe Queries

### Pattern 1: Replace Direct Casts

**Before:**
```typescript
const { data, error } = await (supabase.from('groups') as any)
  .select('*')
  .eq('line_id', lineId);
```

**After (using supabase-helpers.ts):**
```typescript
import { queryTable, Group } from '@/lib/supabase-helpers';

const groups = await queryTable<Group>('groups', '*', { line_id: lineId });
```

### Pattern 2: Update useCrud.ts

**Before:**
```typescript
export function useTable<T>(table: string, opts = {}) {
  return useQuery<T[]>({
    queryFn: async () => {
      const { data, error } = await (supabase.from(table) as any)
        .select(select);
      if (error) throw error;
      return data ?? [];
    }
  });
}
```

**After:**
```typescript
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

export function useTable<T extends TableName>(
  table: T,
  opts = {}
) {
  return useQuery<Tables[T]['Row'][]>({
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select(select);
      if (error) throw error;
      return data ?? [];
    }
  });
}
```

### Pattern 3: Update Admin Tabs

**Before (GroupsTab.tsx):**
```typescript
const { data, error } = await (supabase.from('groups') as any)
  .select('*')
  .eq('line_id', lineId);
```

**After:**
```typescript
import type { Database } from '@/integrations/supabase/types';

type Group = Database['public']['Tables']['groups']['Row'];

const { data, error } = await supabase
  .from('groups')
  .select('*')
  .eq('line_id', lineId);
// data is now typed as Group[] | null
```

## Step 4: Migration Checklist

### Phase 1: Core Hooks (High Priority)

- [ ] `src/hooks/useCrud.ts`
  - [ ] `useTable()` - Add generic type parameter
  - [ ] `useUpsert()` - Type payload parameter
  - [ ] `useDeleteRow()` - Already type-safe

- [ ] `src/features/input/hooks/useShiftSetupData.ts`
  - [ ] `useLeaderGroups()` - Use `Group` type
  - [ ] `useLineProducts()` - Use `ProductLine` type
  - [ ] `useLineOperators()` - Use `OperatorLineAssignment` type
  - [ ] `useLineGroups()` - Use `Group` type
  - [ ] `useGroupPOS()` - Use `GroupProcessAssignment` type

### Phase 2: Admin Tabs (Medium Priority)

- [ ] `src/components/admin/GroupsTab.tsx`
- [ ] `src/components/admin/GroupCard.tsx`
- [ ] `src/components/admin/SkillsTab.tsx`
- [ ] `src/components/admin/SkillMatrixTab.tsx`
- [ ] `src/components/admin/ProcessesTab.tsx`
- [ ] `src/components/admin/ProductsTab.tsx`
- [ ] `src/components/admin/ShiftsTab.tsx`
- [ ] `src/components/admin/FiveFiveLTab.tsx`
- [ ] `src/components/admin/AutonomousTab.tsx`
- [ ] `src/components/admin/NgCategoriesTab.tsx`
- [ ] `src/components/admin/TargetsTab.tsx`
- [ ] `src/components/admin/UsersTab.tsx`

### Phase 3: Modals & Forms (Low Priority)

- [ ] `src/components/admin/GroupFormModal.tsx`
- [ ] `src/components/admin/FiveFiveLFormModal.tsx`
- [ ] `src/components/admin/WorkstationSkillReqModal.tsx`
- [ ] `src/components/admin/UserFormModal.tsx`

## Step 5: Verification

### Run Type Checks

```bash
# Check for type errors
npx tsc --noEmit

# Run linter
npm run lint

# Build project
npm run build
```

### Search for Remaining Casts

```bash
# Find all remaining 'as any' casts
grep -r "as any" src/ --include="*.ts" --include="*.tsx"

# Count occurrences
grep -r "as any" src/ --include="*.ts" --include="*.tsx" | wc -l
```

### Expected Results

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| `as any` casts | 50+ | 0 | ⏳ |
| Type errors | 0 | 0 | ✅ |
| Build success | ✅ | ✅ | ✅ |
| Missing types | 10+ tables | 0 | ⏳ |

## Step 6: Update supabase-helpers.ts

Once types are regenerated, update the helper file:

```typescript
// src/lib/supabase-helpers.ts
import type { Database } from '@/integrations/supabase/types';

// Replace manual type definitions with generated types
export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupLeader = Database['public']['Tables']['group_leaders']['Row'];
export type GroupProcessAssignment = Database['public']['Tables']['group_process_assignments']['Row'];
// ... etc.

// Update query functions to use generated types
export async function queryTable<T extends keyof Database['public']['Tables']>(
  table: T,
  select: string = '*',
  filters?: Record<string, unknown>
): Promise<Database['public']['Tables'][T]['Row'][]> {
  // ... implementation
}
```

## Troubleshooting

### Issue: "Supabase CLI not found"

```bash
npm install -g supabase
```

### Issue: "Not logged in"

```bash
supabase login
```

### Issue: "Project not linked"

```bash
supabase link --project-ref <your-project-ref>
```

### Issue: "Types file is empty"

Check your database connection:
```bash
supabase db pull
supabase gen types typescript --local
```

### Issue: "Table not found in types"

1. Verify table exists in database
2. Check RLS policies allow access
3. Re-run type generation

## Benefits After Migration

✅ **Type Safety**
- Catch typos at compile time
- Autocomplete for table/column names
- Prevent runtime errors

✅ **Developer Experience**
- Better IDE support
- Faster development
- Self-documenting code

✅ **Maintainability**
- Easier refactoring
- Clear data contracts
- Reduced bugs

## Timeline Estimate

| Phase | Effort | Priority |
|-------|--------|----------|
| Regenerate types | 15 min | High |
| Migrate core hooks | 2 hours | High |
| Migrate admin tabs | 4 hours | Medium |
| Migrate modals | 2 hours | Low |
| Testing & verification | 1 hour | High |
| **Total** | **~9 hours** | |

## Next Steps

1. ✅ Run regeneration script
2. ⏳ Verify generated types
3. ⏳ Migrate core hooks
4. ⏳ Migrate admin tabs
5. ⏳ Run full test suite
6. ⏳ Deploy to staging

---

**Last Updated:** 2025-01-01  
**Status:** Ready for implementation
