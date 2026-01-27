import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { cn } from "@/lib/utils";
import { Menu, RefreshCw, LogOut, UserRound, Settings2 } from "lucide-react";
import { AdminProfileDialog } from "@/components/admin/AdminProfileDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AdminTopbarProps {
  title: string;
  description?: string;
  userLabel?: string;
  onLogout: () => void;
  onRefresh?: () => void;
  onOpenSidebar?: () => void;
  onNavigate?: (path: string) => void;
  isMobile?: boolean;
  className?: string;
}

function initialsFromLabel(label?: string) {
  const v = (label || "").trim();
  if (!v) return "AD";
  const parts = v.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "AD";
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  title,
  description,
  userLabel,
  onLogout,
  onRefresh,
  onOpenSidebar,
  onNavigate,
  isMobile,
  className,
}) => {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/75 backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-3 px-4 md:px-8">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onOpenSidebar}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="min-w-0">
            <Breadcrumb className="hidden md:block">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span className="text-muted-foreground">Admin</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-2 md:hidden">
              <span className="text-sm font-semibold text-muted-foreground">
                Admin
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="truncate text-sm font-semibold">{title}</span>
            </div>

            {description && (
              <p className="hidden max-w-[60ch] truncate text-xs text-muted-foreground md:block">
                {description}
              </p>
            )}
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <div className="relative w-full max-w-md">
              <Input
                placeholder="Search (tabs, teachers, courses)…"
                className="h-9 bg-card/60 shadow-none"
                disabled
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Soon
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-2 md:inline-flex"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}

          <ThemeToggle minimal />

          <Separator orientation="vertical" className="mx-1 hidden h-8 md:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 gap-2 rounded-full px-2 hover:bg-muted/60"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[11px] font-semibold">
                    {initialsFromLabel(userLabel)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">
                  {userLabel || "Admin"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm font-semibold">{userLabel || "Admin"}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Dashboard access
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onNavigate && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => onNavigate("/update-password")}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Change password
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setIsProfileDialogOpen(true)}
                  >
                    <UserRound className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AdminProfileDialog
        isOpen={isProfileDialogOpen}
        onClose={() => setIsProfileDialogOpen(false)}
      />
    </header>
  );
};

