import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, Home, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { AuditLogsTab } from "@/components/admin/AuditLogsTab";
import { supabase } from "@/integrations/supabase/client";

export const AuditLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfileData(profile || null);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  const navigationButtons = (
    <div className="flex flex-wrap justify-center md:justify-end gap-2 md:gap-3">
      <ThemeToggle />
      <Button
        onClick={() => navigate("/admin-dashboard")}
        variant="outline"
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base"
      >
        <Home className="w-4 h-4" />
        Dashboard
      </Button>
      <Button
        onClick={() => navigate("/manage-admins")}
        variant="outline"
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base"
      >
        <Shield className="w-4 h-4" />
        Manage Admins
      </Button>
      <Button
        onClick={() => navigate("/department-admin-profile")}
        variant="outline"
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base"
      >
        <User className="w-4 h-4" />
        My Profile
      </Button>
    </div>
  );

  return (
    <div 
      className="min-h-screen bg-background flex flex-col transition-colors duration-500"
      style={profileData?.theme_color ? { backgroundColor: profileData.theme_color } : undefined}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-xl shadow-sm border border-border/50 bg-white/40 dark:bg-black/40 backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="text-center md:text-left">
              <div className="flex justify-center md:justify-start items-center gap-3 mb-2">
                <img
                  src="/favicon.ico"
                  alt="CUK Logo"
                  className="hidden md:block w-10 h-10"
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
                      <img src="/favicon.ico" alt="CUK Logo" className="hidden md:block w-8 h-8" />
                      <span className="font-semibold">Menu</span>
                    </div>
                    {navigationButtons}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
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
