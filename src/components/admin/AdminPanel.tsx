import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/** The bordered surface every admin list sits in. Its first child is usually a `.admin-toolbar`. */
export const AdminPanel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <section className={cn("overflow-hidden rounded-lg border bg-card", className)}>{children}</section>
);

/** Edit + confirmed delete for one table row. Renders inside the row's existing flex container. */
export const RowActions = ({
  onEdit,
  onDelete,
  title,
  description,
}: {
  onEdit: () => void;
  onDelete: () => void;
  title: string;
  description: React.ReactNode;
}) => (
  <>
    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onEdit} aria-label="Edit">
      <Pencil className="h-4 w-4" />
    </Button>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
);

/** Rows of placeholder bars at the real row pitch, so nothing shifts when data lands. */
export const TableSkeleton = ({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) => (
  <div aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, r) => (
      <div key={r} className="flex h-14 items-center gap-6 border-b px-4 last:border-b-0">
        {Array.from({ length: cols }, (_, c) => (
          <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-48" : "w-24", c === cols - 1 && "ml-auto w-16")} />
        ))}
      </div>
    ))}
  </div>
);

/** The whole dashboard while auth and data load: sidebar, title row and one panel. */
export const AdminShellSkeleton = () => (
  <div className="flex min-h-screen bg-background" aria-busy="true" aria-label="Loading dashboard">
    <div className="hidden w-60 shrink-0 flex-col gap-2 border-r p-4 md:flex">
      <div className="mb-4 flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>
      {Array.from({ length: 11 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-36" style={{ marginTop: i === 1 || i === 6 ? 16 : 8 }} />
      ))}
    </div>
    <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-8 md:px-8">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="ml-auto h-9 w-28" />
        </div>
        <TableSkeleton rows={7} />
      </div>
    </div>
  </div>
);
