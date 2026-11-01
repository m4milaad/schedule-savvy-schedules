import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Menu, RefreshCw, LogOut, UserRound, Settings2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";

interface AdminTopbarProps {
  title: string;
  description?: string;
  userLabel?: string;
  userId?: string;
  onLogout: () => void;
  onRefresh?: () => void;
  onOpenSidebar?: () => void;
  /** Opens the Profile tab; `password` jumps to the password section. */
  onOpenProfile?: (password: boolean) => void;
  isMobile?: boolean;
  className?: string;
}

function initialsFromLabel(label?: string) {
  const v = (label || "").trim();
  if (!v) return "AD";
  const parts = v.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "AD";
}

/** The page's title row: the h1, one line about the data, and the real actions. */
export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  title,
  description,
  userLabel,
  userId,
  onLogout,
  onRefresh,
  onOpenSidebar,
  onOpenProfile,
  isMobile,
  className,
}) => {
  const accountMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Account">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-muted text-[11px] font-medium">
              {initialsFromLabel(userLabel)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-sm font-medium">{userLabel || "Admin"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onOpenProfile && (
          <>
            <DropdownMenuItem className="cursor-pointer" onClick={() => onOpenProfile(false)}>
              <UserRound className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => onOpenProfile(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Change password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className="cursor-pointer" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {isMobile ? (
        <header
          className={cn(
            "sticky top-0 z-40 flex h-12 items-center gap-2 border-b bg-background px-2",
            className
          )}
        >
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onOpenSidebar} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h1>
          <NotificationCenter userId={userId} minimal />
          <ThemeToggle minimal />
          {accountMenu}
        </header>
      ) : (
        <header className={cn("mx-auto flex w-full max-w-[1440px] items-start gap-6 px-8 pb-6 pt-8", className)}>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
            {/* Always reserve the line so every tab's panel starts at the same height. */}
            <p className="mt-1 h-5 truncate text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onRefresh && (
              <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            )}
            <NotificationCenter userId={userId} minimal />
            <ThemeToggle minimal />
            {accountMenu}
          </div>
        </header>
      )}
    </>
  );
};
