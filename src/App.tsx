import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Capacitor } from '@capacitor/core';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import MobileSchedule from "./pages/MobileSchedule";
import NotFound from "./pages/NotFound";
import ManageAdmins from "./pages/ManageAdmins";
import EmailVerified from "./pages/EmailVerified";
import ResetPassword from "./pages/ResetPassword";
import DepartmentAdminProfile from "./pages/DepartmentAdminProfile";
import UpdatePassword from "./pages/UpdatePassword";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { AuditLogsPage } from "@/pages/AuditLogsPage";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SplashScreen } from "@/components/mobile/SplashScreen";
import { useState } from "react";
import { SplashScreen as CapacitorSplash } from '@capacitor/splash-screen';

// Kill the native splash immediately before anything renders
const isNativeApp = Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios';
if (isNativeApp) {
  CapacitorSplash.hide({ fadeOutDuration: 0 }).catch(() => {});
}

const App = () => {
  const [queryClient] = useState(() => new QueryClient());
  const [showSplash, setShowSplash] = useState(isNativeApp);

  if (showSplash && isNativeApp) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
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
              <Route path="/admin-logs" element={
                <AdminProtectedRoute>
                  <AuditLogsPage />
                </AdminProtectedRoute>
              }
              />
              <Route 
                path="/update-password" 
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin', 'department_admin']}>
                    <UpdatePassword />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/teacher-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/mobile-schedule" element={
                <ProtectedRoute allowedRoles={['student', 'teacher', 'admin', 'department_admin']}>
                  <MobileSchedule />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
            <OfflineIndicator />
          </TooltipProvider>
        </QueryClientProvider>
        <Analytics />
        <SpeedInsights/>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
