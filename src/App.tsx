import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Login from "./pages/Login";
import RoleLanding from "./pages/RoleLanding";
import Monitoring from "./pages/Monitoring";
import Shift from "./pages/input";
import Admin from "./pages/Admin";
import Traceability from "./pages/Traceability";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AuthProvider>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={<RequireAuth><RoleLanding /></RequireAuth>}
            />
            <Route
              path="/monitoring"
              element={
                <RequirePermission permissions={["monitoring.view"]}>
                  <AppShell><Monitoring /></AppShell>
                </RequirePermission>
              }
            />
            <Route
              path="/shift"
              element={
                <RequirePermission permissions={["shift.input"]}>
                  <AppShell><Shift /></AppShell>
                </RequirePermission>
              }
            />
            <Route
              path="/admin"
              element={
                <RequirePermission permissions={["admin.all"]}>
                  <AppShell><Admin /></AppShell>
                </RequirePermission>
              }
            />
            <Route
              path="/traceability"
              element={
                <RequirePermission permissions={["traceability.view"]}>
                  <AppShell><Traceability /></AppShell>
                </RequirePermission>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
