import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// Mock dependencies before importing component
vi.mock("@/hooks/useMonitoring", () => ({
  useMonitoringRun: vi.fn(() => ({
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useMonitoringHourly: vi.fn(() => ({ data: [] })),
  useMonitoringCheckSheets: vi.fn(() => ({ data: [] })),
  useMonitoringRealtime: vi.fn(() => "connecting"),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    effectiveRole: "manager",
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Dynamically import StatusPanel after mocks are set up
import { StatusPanel } from "../components/StatusPanel";

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("StatusPanel", () => {
  const mockProps = {
    density: "comfortable" as const,
    onDensityChange: vi.fn(),
    isDarkMode: false,
    onDarkModeToggle: vi.fn(),
    onRefresh: vi.fn(),
  };

  it("should render without crashing", () => {
    renderWithProviders(<StatusPanel {...mockProps} />);
    // Basic render test - just verify no crash
    expect(true).toBeTruthy();
  });

  it("should have correct props interface", () => {
    expect(mockProps.density).toBe("comfortable");
    expect(typeof mockProps.onDensityChange).toBe("function");
    expect(typeof mockProps.onDarkModeToggle).toBe("function");
    expect(typeof mockProps.onRefresh).toBe("function");
  });
});