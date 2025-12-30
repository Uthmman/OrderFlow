
"use client"

import * as React from "react"
import { addDays, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "./separator"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    dateRange?: DateRange;
    onDateChange: (dateRange: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  dateRange,
  onDateChange,
}: DateRangePickerProps) {

  const setDatePreset = (preset: 'today' | 'this_week' | 'this_month' | 'this_year') => {
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (preset) {
        case 'today':
            from = now;
            break;
        case 'this_week':
            from = startOfWeek(now);
            to = endOfWeek(now);
            break;
        case 'this_month':
            from = startOfMonth(now);
            to = endOfMonth(now);
            break;
        case 'this_year':
            from = startOfYear(now);
            to = endOfYear(now);
            break;
    }
    onDateChange({ from, to });
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
            <div className="flex">
                <div className="p-4 border-r">
                    <div className="flex flex-col gap-2">
                        <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('today')}>Today</Button>
                        <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('this_week')}>This Week</Button>
                        <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('this_month')}>This Month</Button>
                        <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('this_year')}>This Year</Button>
                    </div>
                </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onDateChange}
                numberOfMonths={2}
              />
            </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
