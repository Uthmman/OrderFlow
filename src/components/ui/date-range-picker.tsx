
"use client"

import * as React from "react"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, getYear, getMonth } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    dateRange?: DateRange;
    onDateChange: (dateRange: DateRange | undefined) => void;
}

const getYears = () => {
    const currentYear = getYear(new Date());
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
        years.push(i.toString());
    }
    return years;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function DateRangePicker({
  className,
  dateRange,
  onDateChange,
}: DateRangePickerProps) {
    
  const [selectedYear, setSelectedYear] = React.useState<string>(getYear(dateRange?.from || new Date()).toString());
  const [selectedMonth, setSelectedMonth] = React.useState<string>(getMonth(dateRange?.from || new Date()).toString());

  const handleMonthSelect = (monthIndex: string) => {
    const month = parseInt(monthIndex, 10);
    const year = parseInt(selectedYear, 10);
    const from = startOfMonth(new Date(year, month));
    const to = endOfMonth(from);
    onDateChange({ from, to });
    setSelectedMonth(monthIndex);
  }
  
  const handleYearSelectForMonth = (year: string) => {
      setSelectedYear(year);
      const month = parseInt(selectedMonth, 10);
      const from = startOfMonth(new Date(parseInt(year, 10), month));
      const to = endOfMonth(from);
      onDateChange({ from, to });
  }

  const handleYearSelect = (year: string) => {
    const from = startOfYear(new Date(parseInt(year, 10), 0));
    const to = endOfYear(from);
    onDateChange({ from, to });
    setSelectedYear(year);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
            <Tabs defaultValue="custom" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="year">Year</TabsTrigger>
                </TabsList>
                <TabsContent value="custom">
                     <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={onDateChange}
                        numberOfMonths={2}
                    />
                </TabsContent>
                <TabsContent value="month" className="p-4">
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Select a specific month and year.</p>
                        <div className="flex items-center gap-2">
                           <Select value={selectedMonth} onValueChange={handleMonthSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((month, index) => (
                                        <SelectItem key={month} value={index.toString()}>{month}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                             <Select value={selectedYear} onValueChange={handleYearSelectForMonth}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getYears().map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="year" className="p-4">
                   <div className="space-y-4">
                       <p className="text-sm text-muted-foreground">Select a specific year.</p>
                       <Select value={selectedYear} onValueChange={handleYearSelect}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                                {getYears().map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                   </div>
                </TabsContent>
            </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  )
}
