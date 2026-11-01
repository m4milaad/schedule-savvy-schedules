import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/** Percentage with a thin bar; under the 75% attendance rule it reads in the destructive colour. */
export const AttendanceBar = ({ value, threshold = 75 }: { value: number; threshold?: number | null }) => (
  <div className="flex items-center gap-2">
    <Progress value={value} className="h-1.5 w-20" aria-hidden />
    <span className={cn("text-sm tabular-nums", threshold !== null && value < threshold ? "text-destructive" : "text-muted-foreground")}>
      {value}%
    </span>
  </div>
);

/** A divided row of label + big number, same look as the Overview "Records" card. */
export const StatStrip = ({ stats, className }: {
  stats: { label: string; value: string | number; muted?: boolean }[];
  className?: string;
}) => (
  <dl className={cn("-mb-px -mr-px grid grid-cols-2 border-t sm:flex", className)}>
    {stats.map((s) => (
      <div key={s.label} className="border-b border-r px-5 py-4 sm:flex-1">
        <dt className="text-sm text-muted-foreground">{s.label}</dt>
        <dd className={cn("mt-1 text-2xl tabular-nums", s.muted && "text-muted-foreground")}>{s.value}</dd>
      </div>
    ))}
  </dl>
);
