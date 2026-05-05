import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useShiftSetup } from '@/features/input/hooks/useShiftSetup';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    effectiveRole: 'leader',
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useShiftSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      expect(result.current.setupStep).toBe(1);
      expect(result.current.step1.workOrderNo).toBe('');
      expect(result.current.step1.lineId).toBe('');
      expect(result.current.step1.productId).toBe('');
      expect(result.current.step1.targetQty).toBe(0);
    });

    it('should have empty checked items initially', () => {
      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      expect(result.current.checkedItems).toEqual([]);
    });
  });

  describe('Step Navigation', () => {
    it('should allow navigation between steps', () => {
      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      expect(result.current.setupStep).toBe(1);

      result.current.setSetupStep(2);
      expect(result.current.setupStep).toBe(2);

      result.current.setSetupStep(3);
      expect(result.current.setupStep).toBe(3);

      result.current.setSetupStep(4);
      expect(result.current.setupStep).toBe(4);
    });
  });

  describe('Step 1 Validation', () => {
    it('should validate required fields', () => {
      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      const isValid = result.current.validateStep1();
      expect(isValid).toBe(false);
      expect(result.current.step1Errors.workOrderNo).toBeTruthy();
      expect(result.current.step1Errors.lineId).toBeTruthy();
      expect(result.current.step1Errors.productId).toBeTruthy();
    });

    it('should pass validation with complete data', () => {
      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      result.current.setStep1({
        workOrderNo: 'WO-2024-001',
        shiftId: 'shift-1',
        prodDate: '2024-01-15',
        lineId: 'line-1',
        groupId: 'group-1',
        productId: 'product-1',
        targetQty: 1600,
        planStartTime: '07:00',
        planFinishTime: '15:00',
        actualStartTime: '07:00',
      });

      const isValid = result.current.validateStep1();
      expect(isValid).toBe(true);
      expect(Object.keys(result.current.step1Errors)).toHaveLength(0);
    });

    it('should validate target quantity is positive', () => {
      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      result.current.setStep1({
        workOrderNo: 'WO-2024-001',
        shiftId: 'shift-1',
        prodDate: '2024-01-15',
        lineId: 'line-1',
        groupId: 'group-1',
        productId: 'product-1',
        targetQty: 0,
        planStartTime: '07:00',
        planFinishTime: '15:00',
        actualStartTime: '07:00',
      });

      const isValid = result.current.validateStep1();
      expect(isValid).toBe(false);
      expect(result.current.step1Errors.targetQty).toBeTruthy();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch lines data', async () => {
      const mockLines = [
        { id: 'line-1', code: 'LINE-A', name: 'Line A', active: true },
        { id: 'line-2', code: 'LINE-B', name: 'Line B', active: true },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockLines, error: null }),
        }),
      } as any);

      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.linesLoading).toBe(false);
      });

      expect(result.current.lines).toHaveLength(2);
    });
  });

  describe('Autonomous Check Items', () => {
    it('should toggle check items', () => {
      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      const itemId = 'check-1';
      
      result.current.setCheckedItems([itemId]);
      expect(result.current.checkedItems).toContain(itemId);

      result.current.setCheckedItems([]);
      expect(result.current.checkedItems).not.toContain(itemId);
    });

    it('should track total checks vs checked items', () => {
      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      expect(result.current.totalChecks).toBeGreaterThan(0);
      expect(result.current.checkedItems.length).toBeLessThanOrEqual(
        result.current.totalChecks
      );
    });
  });

  describe('Error Handling', () => {
    it('should clear specific error when field is updated', () => {
      const { result } = renderHook(() => useShiftSetup(), {
        wrapper: createWrapper(),
      });

      // Trigger validation to create errors
      result.current.validateStep1();
      expect(result.current.step1Errors.workOrderNo).toBeTruthy();

      // Clear specific error
      result.current.clearE('workOrderNo');
      expect(result.current.step1Errors.workOrderNo).toBeUndefined();
    });
  });
});