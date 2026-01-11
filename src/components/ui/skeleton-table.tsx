import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton 
                  className="h-4 w-24" 
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow 
              key={rowIndex}
              className="animate-fade-in"
              style={{ animationDelay: `${rowIndex * 0.05}s` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton 
                    className="h-4 w-full" 
                    style={{ animationDelay: `${(rowIndex * columns + colIndex) * 0.02}s` }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="border rounded-lg p-4 space-y-3 animate-fade-in">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" style={{ animationDelay: '0.1s' }} />
        </div>
        <Skeleton className="h-8 w-20" style={{ animationDelay: '0.15s' }} />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" style={{ animationDelay: '0.2s' }} />
        <Skeleton className="h-8 w-16" style={{ animationDelay: '0.25s' }} />
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 0.1}s` }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}
