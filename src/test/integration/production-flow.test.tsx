import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ShiftPage from '@/pages/input';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() => Promise.resolve({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'leader@test.com' },
          },
        },
      })),
    },
    from: vi.fn((table: string) => {
      const mockData: Record<string, any> = {
        lines: [
          { id: 'line-1', code: 'LINE-A', name: 'Line A', active: true },
          { id: 'line-2', code: 'LINE-B', name: 'Line B', active: true },
        ],
        products: [
          { id: 'prod-1', code: 'CCU-A', name: 'CCU Type A', active: true },
          { id: 'prod-2', code: 'CCU-B', name: 'CCU Type B', active: true },
        ],
        shifts: [
          { id: 'shift-1', code: 'S1', name: 'Shift 1', start_time: '07:00', end_time: '15:00', active: true },
          { id: 'shift-2', code: 'S2', name: 'Shift 2', start_time: '15:00', end_time: '23:00', active: true },
        ],
        groups: [
          { id: 'group-1', code: 'GRP-A', line_id: 'line-1' },
        ],
        group_leaders: [
          { id: 'gl-1', group_id: 'group-1', operator_id: 'op-1' },
        ],
        processes: [
          { id: 'proc-1', code: 'PROC-01', name: 'Process 1', active: true },
        ],
      };

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockData[table] || [], error: null })),
          order: vi.fn(() => Promise.resolve({ data: mockData[table] || [], error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: mockData[table]?.[0] || null, error: null })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'new-shift-run-id' },
              error: null,
            })),
          })),
        })),
      };
    }),
    rpc: vi.fn((fn: string) => {
      if (fn === 'get_my_roles') {
        return Promise.resolve({ data: ['leader'], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Production Flow Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Production Setup Flow', () => {
    it('should complete full production setup from step 1 to 4', async () => {
      render(<ShiftPage />, { wrapper: createWrapper() });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText(/setup awal production run/i)).toBeInTheDocument();
      });

      // ── STEP 1: Info Dasar ──
      expect(screen.getByText(/step 01/i)).toBeInTheDocument();

      // Fill Work Order
      const woInput = screen.getByPlaceholderText(/WO-/i);
      fireEvent.change(woInput, { target: { value: 'WO-2024-001' } });

      // Select Shift
      await waitFor(() => {
        const shift1Button = screen.getByText(/shift 1/i);
        fireEvent.click(shift1Button);
      });

      // Select Production Date
      const dateInput = screen.getByLabelText(/tanggal produksi/i);
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } });

      // Select Line
      await waitFor(() => {
        const lineSelect = screen.getByLabelText(/lini produksi/i);
        fireEvent.change(lineSelect, { target: { value: 'line-1' } });
      });

      // Wait for groups to load and select
      await waitFor(() => {
        const groupButton = screen.getByText(/GRP-A/i);
        fireEvent.click(groupButton);
      });

      // Select Product
      await waitFor(() => {
        const productSelect = screen.getByLabelText(/produk yang diproduksi/i);
        fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      });

      // Enter Target Quantity
      const qtyInput = screen.getByLabelText(/rencana qty/i);
      fireEvent.change(qtyInput, { target: { value: '1600' } });

      // Click Next to Step 2
      const nextButton = screen.getByRole('button', { name: /lanjut/i });
      fireEvent.click(nextButton);

      // ── STEP 2: Man Power & WI ──
      await waitFor(() => {
        expect(screen.getByText(/step 02/i)).toBeInTheDocument();
      });

      // Verify workstation data is displayed
      await waitFor(() => {
        expect(screen.getByText(/workstation/i)).toBeInTheDocument();
      });

      // Click Next to Step 3
      const step2NextButton = screen.getByRole('button', { name: /lanjut/i });
      fireEvent.click(step2NextButton);

      // ── STEP 3: Autonomous Check Sheet ──
      await waitFor(() => {
        expect(screen.getByText(/step 03/i)).toBeInTheDocument();
        expect(screen.getByText(/autonomous maintenance/i)).toBeInTheDocument();
      });

      // Check some autonomous items
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.slice(0, 3).forEach(checkbox => {
        fireEvent.click(checkbox);
      });

      // Click Next to Step 4
      const step3NextButton = screen.getByRole('button', { name: /lanjut/i });
      fireEvent.click(step3NextButton);

      // ── STEP 4: Konfirmasi ──
      await waitFor(() => {
        expect(screen.getByText(/step 04/i)).toBeInTheDocument();
        expect(screen.getByText(/ringkasan setup/i)).toBeInTheDocument();
      });

      // Verify summary shows completed steps
      expect(screen.getByText(/info dasar.*completed/i)).toBeInTheDocument();

      // Add optional notes
      const notesTextarea = screen.getByPlaceholderText(/tambahkan catatan/i);
      fireEvent.change(notesTextarea, {
        target: { value: 'Setup completed successfully' },
      });

      // Submit production run
      const submitButton = screen.getByRole('button', { name: /mulai produksi/i });
      fireEvent.click(submitButton);

      // Verify submission
      await waitFor(() => {
        const { supabase } = require('@/integrations/supabase/client');
        expect(supabase.from).toHaveBeenCalledWith('shift_runs');
      });
    });

    it('should validate required fields before allowing next step', async () => {
      render(<ShiftPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/setup awal production run/i)).toBeInTheDocument();
      });

      // Try to proceed without filling required fields
      const nextButton = screen.getByRole('button', { name: /lanjut/i });
      fireEvent.click(nextButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/work order.*required/i)).toBeInTheDocument();
        expect(screen.getByText(/lini.*required/i)).toBeInTheDocument();
      });

      // Should still be on step 1
      expect(screen.getByText(/step 01/i)).toBeInTheDocument();
    });

    it('should allow navigation back to previous steps', async () => {
      render(<ShiftPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/setup awal production run/i)).toBeInTheDocument();
      });

      // Fill minimum required fields
      const woInput = screen.getByPlaceholderText(/WO-/i);
      fireEvent.change(woInput, { target: { value: 'WO-2024-001' } });

      await waitFor(() => {
        const shift1Button = screen.getByText(/shift 1/i);
        fireEvent.click(shift1Button);
      });

      const dateInput = screen.getByLabelText(/tanggal produksi/i);
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } });

      await waitFor(() => {
        const lineSelect = screen.getByLabelText(/lini produksi/i);
        fireEvent.change(lineSelect, { target: { value: 'line-1' } });
      });

      await waitFor(() => {
        const groupButton = screen.getByText(/GRP-A/i);
        fireEvent.click(groupButton);
      });

      await waitFor(() => {
        const productSelect = screen.getByLabelText(/produk yang diproduksi/i);
        fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      });

      const qtyInput = screen.getByLabelText(/rencana qty/i);
      fireEvent.change(qtyInput, { target: { value: '1600' } });

      // Go to step 2
      const nextButton = screen.getByRole('button', { name: /lanjut/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/step 02/i)).toBeInTheDocument();
      });

      // Go back to step 1
      const backButton = screen.getByRole('button', { name: /kembali/i });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText(/step 01/i)).toBeInTheDocument();
      });

      // Verify data is preserved
      const woInputAfterBack = screen.getByPlaceholderText(/WO-/i) as HTMLInputElement;
      expect(woInputAfterBack.value).toBe('WO-2024-001');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' },
          })),
        })),
      } as any);

      render(<ShiftPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show loading states during data fetch', async () => {
      render(<ShiftPage />, { wrapper: createWrapper() });

      // Should show loading indicator initially
      expect(screen.getByText(/memuat data master/i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/memuat data master/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    it('should preserve form data when switching between steps', async () => {
      render(<ShiftPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/setup awal production run/i)).toBeInTheDocument();
      });

      // Fill form data
      const woInput = screen.getByPlaceholderText(/WO-/i);
      fireEvent.change(woInput, { target: { value: 'WO-2024-TEST' } });

      // Navigate to step 2 and back
      const nextButton = screen.getByRole('button', { name: /lanjut/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /kembali/i });
        fireEvent.click(backButton);
      });

      // Verify data is still there
      const woInputAfter = screen.getByPlaceholderText(/WO-/i) as HTMLInputElement;
      expect(woInputAfter.value).toBe('WO-2024-TEST');
    });
  });
});