
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Settings } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const [examInput, setExamInput] = useState("");
  const [semester, setSemester] = useState("odd");
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const navigate = useNavigate();

  const handleGenerateSchedule = () => {
    // TODO: Implement schedule generation logic
    console.log("Generating schedule with:", { examInput, semester, holidays });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setHolidays(prev => [...prev, date]);
      setSelectedDate(undefined);
    }
  };

  const removeHoliday = (dateToRemove: Date) => {
    setHolidays(holidays.filter(date => date.getTime() !== dateToRemove.getTime()));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Exam Schedule Generator
            </h1>
            <p className="text-gray-600">
              Generate optimized exam schedules with conflict detection
            </p>
          </div>
          <Button 
            onClick={() => navigate('/admin-login')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Admin Panel
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Configuration</CardTitle>
              <CardDescription>
                Enter exam details and select semester
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exams">Exam Details</Label>
                <Input
                  id="exams"
                  placeholder="Enter exams: (BT-102, AH), (CS-101, SM)"
                  value={examInput}
                  onChange={(e) => setExamInput(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-sm text-gray-500">
                  Format: (Course Code, Teacher Code), separated by commas
                </p>
              </div>

              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="odd">Odd Semester</SelectItem>
                    <SelectItem value="even">Even Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleGenerateSchedule} className="w-full">
                Generate Schedule
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Holidays</CardTitle>
              <CardDescription>
                Select additional holidays to avoid scheduling exams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="space-y-2">
                <Label>Selected Holidays:</Label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {holidays.length === 0 ? (
                    <p className="text-sm text-gray-500">No holidays selected</p>
                  ) : (
                    holidays.map((holiday, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-blue-50 p-2 rounded text-sm"
                      >
                        <span>{format(holiday, "PPP")}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeHoliday(holiday)}
                        >
                          ×
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
