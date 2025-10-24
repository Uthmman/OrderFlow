
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";

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
    if (!orderId || orderId.length < 5) {
        return `#ZF-ORD-${orderId}`;
    }
    const numericPart = orderId.slice(-5);
    return `#ZF-ORD-${numericPart}`;
}

export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '';
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toLocaleDateString();
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toLocaleDateString();
  }
   if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  }
  return 'Invalid Date';
}
