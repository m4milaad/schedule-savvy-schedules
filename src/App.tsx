import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import ChatbotAssistant from "@/pages/ChatbotAssistant";
import { useState } from "react";

// Check if running in Android WebView
const isNativeApp = /Android.*wv/.test(navigator.userAgent);

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Global defaults for all queries
        staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
        gcTime: 30 * 60 * 1000, // 30 minutes - cache retention
        refetchOnWindowFocus: false, // Reduce noisy refetches
        retry: (failureCount, error: any) => {
          // Don't retry on auth errors (401, 403)
          if (error?.status === 401 || error?.status === 403) return false;
          // Retry up to 2 times for other errors
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: false, // Don't retry mutations by default
      },
    },
  }));
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
            <HashRouter>
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
                    <Navigate to="/admin-dashboard?tab=generator" replace />
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
              <Route
                path="/assistant"
                element={
                  <ProtectedRoute allowedRoles={['student', 'teacher', 'admin', 'department_admin']}>
                    <ChatbotAssistant />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
              </Routes>
              <OfflineIndicator />
            </HashRouter>
          </TooltipProvider>
        </QueryClientProvider>
        <Analytics />
        <SpeedInsights/>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
