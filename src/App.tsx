
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import MobileSchedule from "./pages/MobileSchedule";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  // Check if running in Capacitor (mobile app)
  const isCapacitor = window.location.protocol === 'capacitor:' || 
                     (window.location.hostname === 'localhost' && window.location.port === '');

  return (
    <ThemeProvider defaultTheme="system" storageKey="cuk-exam-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route 
                path="/" 
                element={
                  isCapacitor ? <Navigate to="/mobile-schedule" replace /> : 
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/auth" element={<Auth />} />
              <Route 
                path="/schedule-generator" 
                element={
                  <AdminProtectedRoute>
                    <Index />
                  </AdminProtectedRoute>
                } 
              />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route 
                path="/admin-dashboard" 
                element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                } 
              />
              <Route 
                path="/admin-users" 
                element={
                  <AdminProtectedRoute>
                    <AdminUsers />
                  </AdminProtectedRoute>
                } 
              />
              <Route path="/mobile-schedule" element={<MobileSchedule />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
