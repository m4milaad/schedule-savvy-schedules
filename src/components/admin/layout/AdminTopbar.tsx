import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Menu, RefreshCw } from "lucide-react";
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
  onOpenProfile?: () => void;
  notificationsPinned?: React.ComponentProps<typeof NotificationCenter>["pinned"];
  /** Text tokens for a custom page background (desktop title row only). */
  style?: React.CSSProperties;
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
  notificationsPinned,
  isMobile,
  className,
  style,
}) => {
  const accountMenu = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-full"
      onClick={onOpenProfile}
      aria-label="Profile"
      title={userLabel || "Profile"}
    >
      <Avatar className="h-7 w-7 border">
        <AvatarFallback className="bg-card text-[11px] font-medium text-card-foreground">
          {initialsFromLabel(userLabel)}
        </AvatarFallback>
      </Avatar>
    </Button>
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
          <NotificationCenter userId={userId} minimal pinned={notificationsPinned} />
          <ThemeToggle minimal />
          {accountMenu}
        </header>
      ) : (
        <header className={cn("mx-auto flex w-full max-w-[1440px] items-start gap-6 px-8 pb-6 pt-8", className)} style={style}>
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
            <NotificationCenter userId={userId} minimal pinned={notificationsPinned} />
            <ThemeToggle minimal />
            {accountMenu}
          </div>
        </header>
      )}
    </>
  );
};
