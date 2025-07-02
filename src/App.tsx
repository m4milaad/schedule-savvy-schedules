
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import MobileSchedule from "./pages/MobileSchedule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Check if running in Capacitor (mobile app)
  const isCapacitor = window.location.protocol === 'capacitor:' || 
                     window.location.hostname === 'localhost' && window.location.port === '';

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirect to mobile schedule for Capacitor app */}
            <Route 
              path="/" 
              element={isCapacitor ? <Navigate to="/mobile-schedule" replace /> : <Index />} 
            />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/mobile-schedule" element={<MobileSchedule />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
