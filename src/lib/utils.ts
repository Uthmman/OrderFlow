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
  let date: Date;

  if (!timestamp) {
    return 'Invalid Date';
  }

  // Convert from various formats to a JavaScript Date object
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    // Firestore Timestamp-like object
    date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    // String or number (milliseconds)
    const parsedDate = new Date(timestamp);
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate;
    } else {
      return 'Invalid Date';
    }
  } else {
    return 'Invalid Date';
  }

  // Final check if a valid date was created
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  // Use toLocaleDateString for a simple, locale-aware date format
  return date.toLocaleDateString();
}


// Helper to format a Date object to "yyyy-MM-dd" for input[type=date]
export function formatToYyyyMmDd(date: Date | any): string {
  if (!date) return '';
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (date.seconds) { // Firestore Timestamp
    d = date.toDate();
  } else if (typeof date === 'string') {
    // Handles both ISO strings and yyyy-mm-dd strings
    d = new Date(date);
     // The date constructor might parse a yyyy-mm-dd string as UTC, causing off-by-one day errors.
     // Let's correct for the timezone offset.
    d = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  }
  else {
    return ''; // Invalid format
  }
  
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}


// Helper function to compress an image file on the client
export const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        const MIME_TYPE = "image/jpeg";
        const QUALITY = 0.7;

        const blobURL = URL.createObjectURL(file);
        const img = new Image();
        img.src = blobURL;
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error("Failed to load image."));
        };
        img.onload = () => {
            URL.revokeObjectURL(img.src);

            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return reject(new Error("Failed to get canvas context."));
            }
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        return reject(new Error("Canvas to Blob conversion failed."));
                    }
                    const newFile = new File([blob], file.name, {
                        type: MIME_TYPE,
                        lastModified: Date.now(),
                    });
                    resolve(newFile);
                },
                MIME_TYPE,
                QUALITY
            );
        };
    });
};