import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Trash2, Download, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onEmail?: () => void;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onDelete,
  onExport,
  onEmail,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5",
        className
      )}
    >
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg border px-4 py-3 flex items-center gap-4">
        <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
          {selectedCount} selected
        </Badge>

        <div className="flex items-center gap-2">
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}

          {onExport && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onExport}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}

          {onEmail && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onEmail}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          )}

          <div className="w-px h-6 bg-primary-foreground/20" />

          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
