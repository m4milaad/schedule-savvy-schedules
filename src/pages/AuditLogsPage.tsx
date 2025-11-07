import React from "react";
import { Button } from "@/components/ui/button";
import { Menu, Home, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { AuditLogsTab } from "@/components/admin/AuditLogsTab";

export const AuditLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const navigationButtons = (
    <div className="flex flex-wrap justify-center md:justify-end gap-2 md:gap-3">
      <ThemeToggle />
      <Button
        onClick={() => navigate("/admin-dashboard")}
        variant="outline"
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base hover:scale-105 transition-all"
      >
        <Home className="w-4 h-4" />
        Dashboard
      </Button>
      <Button
        onClick={() => navigate("/manage-admins")}
        variant="outline"
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base hover:scale-105 transition-all"
      >
        <Shield className="w-4 h-4" />
        Manage Admins
      </Button>
      <Button
        onClick={() => navigate("/department-admin-profile")}
        variant="outline"
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base hover:scale-105 transition-all"
      >
        <User className="w-4 h-4" />
        My Profile
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-500">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <div className="text-center md:text-left">
            <div className="flex justify-center md:justify-start items-center gap-3 mb-2">
              <img
                src="/favicon.ico"
                alt="CUK Logo"
                className="w-10 h-10 transition-transform hover:scale-110"
              />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                System Audit Logs
              </h1>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              Track system activities, database updates, and administrative actions.
            </p>
          </div>

          {/* Desktop navigation */}
          {!isMobile && navigationButtons}

          {/* Mobile Sheet Navigation */}
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <img src="/favicon.ico" alt="CUK Logo" className="w-8 h-8" />
                    <span className="font-semibold">Menu</span>
                  </div>
                  {navigationButtons}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Main Logs Section */}
        <div className="animate-fade-in">
          <AuditLogsTab />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AuditLogsPage;
