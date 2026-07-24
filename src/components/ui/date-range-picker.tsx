"use client"

import * as React from "react"
import { format, addDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns"
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

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    dateRange?: DateRange;
    onDateChange: (dateRange: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  dateRange,
  onDateChange,
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const setRange = (range: DateRange | undefined) => {
        onDateChange(range);
        setIsOpen(false);
    }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-10 sm:w-[260px] h-10 sm:h-10 justify-center sm:justify-start px-0 sm:px-4 text-left font-normal overflow-hidden",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="sm:mr-2 h-4 w-4 shrink-0" />
            <span className="hidden sm:inline truncate">
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
                "Pick a date range"
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex flex-col sm:flex-row" align="end">
            <div className="flex flex-col space-y-1 p-2 border-b sm:border-b-0 sm:border-r bg-muted/20">
                <Button variant="ghost" className="justify-start font-normal h-8 px-2 text-xs" onClick={() => setRange({ from: new Date(), to: new Date() })}>Today</Button>
                <Button variant="ghost" className="justify-start font-normal h-8 px-2 text-xs" onClick={() => setRange({ from: addDays(new Date(), -7), to: new Date() })}>Last 7 days</Button>
                <Button variant="ghost" className="justify-start font-normal h-8 px-2 text-xs" onClick={() => setRange({ from: addDays(new Date(), -30), to: new Date() })}>Last 30 days</Button>
                <Button variant="ghost" className="justify-start font-normal h-8 px-2 text-xs" onClick={() => setRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                <Button variant="ghost" className="justify-start font-normal h-8 px-2 text-xs" onClick={() => {
                    const lastMonth = subMonths(new Date(), 1);
                    setRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
                }}>Last Month</Button>
                <Button variant="ghost" className="justify-start font-normal h-8 px-2 text-xs" onClick={() => setRange({ from: startOfYear(new Date()), to: endOfYear(new Date()) })}>This Year</Button>
                 <Button variant="ghost" className="justify-start font-normal text-destructive hover:text-destructive h-8 px-2 text-xs" onClick={() => setRange(undefined)}>Clear</Button>
            </div>
             <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onDateChange}
                numberOfMonths={1}
            />
        </PopoverContent>
      </Popover>
    </div>
  )
}
