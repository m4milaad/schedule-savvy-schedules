
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarIcon, AlertTriangle } from "lucide-react";

interface ScheduleStatusCardProps {
  scheduleCount: number;
  overrideRules: boolean;
  onOverrideChange: (value: boolean) => void;
}

export const ScheduleStatusCard = ({
  scheduleCount,
  overrideRules,
  onOverrideChange,
}: ScheduleStatusCardProps) => {
  return (
    <Card className="mb-6 bg-green-50 border-green-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">
              Last Generated Schedule Loaded ({scheduleCount} exams)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="override-rules"
                checked={overrideRules}
                onCheckedChange={onOverrideChange}
              />
              <Label htmlFor="override-rules" className="text-sm font-medium">
                Override Drag & Drop Rules
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>When enabled, allows moving exams without constraint validation</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
