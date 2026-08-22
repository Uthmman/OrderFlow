
import { isSaturday, getHours } from 'date-fns';

/**
 * Checks if an absence at a specific date/time should be deducted from pay.
 * Monthly workers are exempt from deductions on Saturday afternoons.
 * 
 * @param date The date and time of the absence.
 * @param workerType The classification of the worker.
 * @returns boolean True if the absence is deductible, false otherwise.
 */
export function isAbsentDeductible(date: Date, workerType: 'Monthly' | 'Daily' | undefined): boolean {
  if (workerType === 'Monthly' && isSaturday(date)) {
    const hours = getHours(date);
    // Saturday afternoon deduction rule: No deduction after 12:00 PM
    if (hours >= 12) {
      return false;
    }
  }
  return true;
}
