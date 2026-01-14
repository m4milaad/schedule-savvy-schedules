import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  // accentColor kept for backward compatibility but unused in minimal design
  accentColor?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("prof-card h-full group", className)}>
      <CardContent className="p-5 h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
            {title}
          </h3>
          {Icon && (
            <Icon className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground transition-colors duration-200" />
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <motion.div
              className="text-2xl font-semibold tracking-tight text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {value}
            </motion.div>

            {trend && (
              <span
                className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded-full bg-opacity-10",
                  trend.isPositive
                    ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                    : "text-rose-600 bg-rose-500/10 dark:text-rose-400"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            )}
          </div>

          {description && (
            <p className="text-xs text-muted-foreground/80 mt-1 truncate">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
