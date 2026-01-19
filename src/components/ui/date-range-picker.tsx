"use client"

import * as React from "react"
import { format, addDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
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
              "w-full sm:w-[260px] justify-start text-left font-normal",
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
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex" align="end">
            <div className="flex flex-col space-y-1 p-2 border-r">
                <Button variant="ghost" className="justify-start font-normal h-8 px-2" onClick={() => setRange({ from: new Date(), to: new Date() })}>Today</Button>
                <Button variant="ghost" className="justify-start font-normal h-8 px-2" onClick={() => setRange({ from: addDays(new Date(), -7), to: new Date() })}>Last 7 days</Button>
                <Button variant="ghost" className="justify-start font-normal h-8 px-2" onClick={() => setRange({ from: addDays(new Date(), -30), to: new Date() })}>Last 30 days</Button>
                <Button variant="ghost" className="justify-start font-normal h-8 px-2" onClick={() => setRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                <Button variant="ghost" className="justify-start font-normal h-8 px-2" onClick={() => {
                    const lastMonth = subMonths(new Date(), 1);
                    setRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
                }}>Last Month</Button>
                 <Button variant="ghost" className="justify-start font-normal text-destructive hover:text-destructive h-8 px-2" onClick={() => setRange(undefined)}>Clear</Button>
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
