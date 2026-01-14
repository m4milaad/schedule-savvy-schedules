
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";

interface ScheduleStatusCardProps {
  scheduleCount: number;
}

export const ScheduleStatusCard = ({
  scheduleCount,
}: ScheduleStatusCardProps) => {
  return (
    <Card className="linear-surface mb-6 border-green-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">
              Last Generated Schedule Loaded ({scheduleCount} exams)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
