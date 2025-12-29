import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  if (typeof amount !== 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(0);
  }
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
  if (!timestamp) {
    return ''; // Return empty for null/undefined to avoid "Invalid Date"
  }

  // Case 1: It's already a JavaScript Date object
  if (timestamp instanceof Date) {
    if (isNaN(timestamp.getTime())) return 'Invalid Date';
    return timestamp.toLocaleDateString();
  }
  
  // Case 2: It's a Firestore Timestamp object (has .toDate method)
  if (timestamp instanceof Timestamp || (typeof timestamp === 'object' && timestamp !== null && typeof timestamp.toDate === 'function')) {
    return timestamp.toDate().toLocaleDateString();
  }
  
  // Case 3: It's a plain object from Firestore { seconds: ..., nanoseconds: ... } after prototype loss
  if (typeof timestamp === 'object' && timestamp !== null && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  }

  // Case 4: It's a string or a number that can be parsed by new Date()
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  }

  return 'Invalid Date'; // Fallback for any other unexpected format
}


// Helper to format a Date object to "yyyy-MM-dd" for input[type=date]
export function formatToYyyyMmDd(date: Date | any): string {
  if (!date) return '';
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (date.seconds) { // Firestore Timestamp or plain object
    d = new Date(date.seconds * 1000);
  } else if (typeof date === 'string') {
    // Handles both ISO strings and yyyy-mm-dd strings
    const parsedDate = new Date(date);
     // If the string is just 'yyyy-mm-dd', it's parsed as UTC. Correct for timezone offset.
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        d = new Date(parsedDate.getTime() + parsedDate.getTimezoneOffset() * 60000);
    } else {
        d = parsedDate;
    }
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
