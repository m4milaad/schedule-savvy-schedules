
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
  semesterBreakdown: Array<{
    semester: number;
    courseCount: number;
    totalGapDays: number;
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
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium text-blue-700">Date Range Analysis</Label>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Days:</span>
                  <span className="font-medium">{dateRangeInfo.totalDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weekends:</span>
                  <span className="font-medium">{dateRangeInfo.weekendDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Holidays:</span>
                  <span className="font-medium">{dateRangeInfo.holidayCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">Working Days:</span>
                  <span className="font-bold text-green-700">{dateRangeInfo.workingDays}</span>
                </div>
              </div>
              
              {dateRangeInfo.holidaysInRange.length > 0 && (
                <div className="mt-3 pt-2 border-t border-blue-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">Holidays in Range:</div>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {dateRangeInfo.holidaysInRange.map((holiday, index) => (
                      <div key={index} className="text-xs bg-white p-1 rounded border">
                        <div className="font-medium">{new Date(holiday.holiday_date).toLocaleDateString()}</div>
                        <div className="text-gray-600">{holiday.holiday_name}</div>
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
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : (
                <CalendarDays className="h-4 w-4 text-green-600" />
              )}
              <Label className={`text-sm font-medium ${isInsufficientDays ? 'text-red-700' : 'text-green-700'}`}>
                Schedule Requirements
              </Label>
            </div>
            
            <div className={`p-3 rounded-lg space-y-2 ${isInsufficientDays ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Courses:</span>
                  <span className="font-medium">{minimumDaysInfo.totalCourses}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isInsufficientDays ? 'text-red-700' : 'text-green-700'}`}>
                    Min Days Needed:
                  </span>
                  <span className={`font-bold ${isInsufficientDays ? 'text-red-700' : 'text-green-700'}`}>
                    {minimumDaysInfo.minimumDays}
                  </span>
                </div>
              </div>

              {isInsufficientDays && dateRangeInfo && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                  <div className="font-medium">⚠️ Insufficient Time Range</div>
                  <div>Need {minimumDaysInfo.minimumDays - dateRangeInfo.workingDays} more working days</div>
                </div>
              )}
              
              {minimumDaysInfo.semesterBreakdown.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">By Semester:</div>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {minimumDaysInfo.semesterBreakdown.map((sem, index) => (
                      <div key={index} className="text-xs bg-white p-1 rounded border flex justify-between">
                        <span>Sem {sem.semester}: {sem.courseCount} courses</span>
                        <span className="text-gray-600">{sem.totalGapDays} days</span>
                      </div>
                    ))}
                  </div>
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

        {isScheduleGenerated && (
          <div className="space-y-2">
            <Button
              onClick={onSaveSchedule}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Schedule
            </Button>
            <Button
              onClick={onDownloadExcel}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Excel
            </Button>
          </div>
        )}

        {/* Holidays Information - Only show when no date range is selected */}
        {!dateRangeInfo && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">Holidays</Label>
            </div>
            <div className="text-sm text-gray-600">
              {holidays.length > 0 ? (
                <div>
                  <p className="mb-2">{holidays.length} holidays configured</p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {holidays.slice(0, 3).map((holiday, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-1 rounded">
                        {holiday.toLocaleDateString()}
                      </div>
                    ))}
                    {holidays.length > 3 && (
                      <div className="text-xs text-gray-500">
                        ... and {holidays.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p>No holidays configured</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Holidays are managed in the Admin Panel
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
