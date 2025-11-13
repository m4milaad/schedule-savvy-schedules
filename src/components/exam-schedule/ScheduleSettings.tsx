
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Save, Download, CalendarDays, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Holiday } from "@/types/examSchedule";

interface DateRangeInfo {
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  holidaysInRange: Holiday[];
  holidayCount: number;
}

interface MinimumDaysInfo {
  totalCourses: number;
  minimumDays: number;
  studentBreakdown: Array<{
    courseCode: string;
    studentCount: number;
    gapDays: number;
  }>;
}

interface ScheduleSettingsProps {
  startDate?: Date;
  endDate?: Date;
  holidays: Date[];
  dateRangeInfo: DateRangeInfo | null;
  minimumDaysInfo: MinimumDaysInfo | null;
  isScheduleGenerated: boolean;
  loading: boolean;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onGenerateSchedule: () => void;
  onSaveSchedule: () => void;
  onDownloadExcel: () => void;
}

export const ScheduleSettings = ({
  startDate,
  endDate,
  holidays,
  dateRangeInfo,
  minimumDaysInfo,
  isScheduleGenerated,
  loading,
  onStartDateChange,
  onEndDateChange,
  onGenerateSchedule,
  onSaveSchedule,
  onDownloadExcel,
}: ScheduleSettingsProps) => {
  const isInsufficientDays = dateRangeInfo && minimumDaysInfo && 
    dateRangeInfo.workingDays < minimumDaysInfo.minimumDays;

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>Schedule Settings</CardTitle>
        <CardDescription>Configure exam dates or view last schedule</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Exam Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Pick start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={onStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Exam End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Pick end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={onEndDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date Range Information */}
        {dateRangeInfo && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <Label className="text-sm font-medium text-blue-700 dark:text-blue-400">Date Range Analysis</Label>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Days:</span>
                  <span className="font-medium dark:text-gray-200">{dateRangeInfo.totalDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Weekends:</span>
                  <span className="font-medium dark:text-gray-200">{dateRangeInfo.weekendDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Holidays:</span>
                  <span className="font-medium dark:text-gray-200">{dateRangeInfo.holidayCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-400 font-medium">Working Days:</span>
                  <span className="font-bold text-green-700 dark:text-green-400">{dateRangeInfo.workingDays}</span>
                </div>
              </div>

              {dateRangeInfo.holidaysInRange.length > 0 && (
                <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Holidays in Range:</div>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {dateRangeInfo.holidaysInRange.map((holiday, index) => (
                      <div key={index} className="text-xs bg-white dark:bg-gray-800 p-1 rounded border dark:border-gray-700">
                        <div className="font-medium dark:text-gray-200">{new Date(holiday.holiday_date).toLocaleDateString()}</div>
                        <div className="text-gray-600 dark:text-gray-400">{holiday.holiday_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Minimum Days Requirement */}
        {minimumDaysInfo && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              {isInsufficientDays ? (
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : (
                <CalendarDays className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
              <Label className={`text-sm font-medium ${isInsufficientDays ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                Schedule Requirements
              </Label>
            </div>

            <div className={`p-3 rounded-lg space-y-2 ${isInsufficientDays ? 'bg-red-50 dark:bg-red-950/30' : 'bg-green-50 dark:bg-green-950/30'}`}>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Courses:</span>
                  <span className="font-medium dark:text-gray-200">{minimumDaysInfo.totalCourses}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isInsufficientDays ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                    Min Days Needed:
                  </span>
                  <span className={`font-bold ${isInsufficientDays ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                    {minimumDaysInfo.minimumDays}
                  </span>
                </div>
              </div>

              {isInsufficientDays && dateRangeInfo && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs text-red-800 dark:text-red-300">
                  <div className="font-medium">⚠️ Insufficient Time Range</div>
                  <div>Need {minimumDaysInfo.minimumDays - dateRangeInfo.workingDays} more working days</div>
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={onGenerateSchedule}
          className="w-full"
          disabled={loading || isInsufficientDays}
        >
          Generate New Schedule
        </Button>


      </CardContent>
    </Card>
  );
};
