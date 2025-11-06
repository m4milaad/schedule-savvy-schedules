
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MobileSchedule from "./pages/MobileSchedule";
import NotFound from "./pages/NotFound";
import ManageAdmins from "./pages/ManageAdmins";
import EmailVerified from "./pages/EmailVerified";
import ResetPassword from "./pages/ResetPassword";
import DepartmentAdminProfile from "./pages/DepartmentAdminProfile";
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
              <Route path="/email-verified" element={<EmailVerified />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route 
                path="/schedule-generator" 
                element={
                  <AdminProtectedRoute>
                    <Index />
                  </AdminProtectedRoute>
                } 
              />
              <Route 
                path="/admin-dashboard" 
                element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                } 
              />
              <Route 
                path="/manage-admins" 
                element={
                  <AdminProtectedRoute>
                    <ManageAdmins />
                  </AdminProtectedRoute>
                } 
              />
              <Route 
                path="/department-admin-profile" 
                element={
                  <AdminProtectedRoute>
                    <DepartmentAdminProfile />
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
