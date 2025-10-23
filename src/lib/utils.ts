import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatOrderId(orderId: string) {
    if (!orderId || orderId.length < 6) {
        return orderId;
    }
    return `${orderId.substring(0, 2).toUpperCase()}${orderId.slice(-5)}`
}
