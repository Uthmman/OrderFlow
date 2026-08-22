
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";
import type { Product } from "./types";

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

export function formatOrderUniqueName(customerName?: string, products?: Product[], orderId?: string) {
  const firstName = customerName?.split(' ')[0] || 'Customer';
  const productsName = formatProductDisplay(products);
  const shortId = orderId?.slice(-5).toUpperCase() || 'XXXXX';
  return `${firstName} - ${productsName} - ${shortId}`;
}

export function formatTimestamp(timestamp: any): string {
  if (!timestamp) {
    return 'Invalid Date';
  }

  let date: Date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'object' && timestamp !== null && typeof timestamp.seconds === 'number') {
    date = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return 'Invalid Date';
  }

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString();
}


export function formatToYyyyMmDd(date: Date | any): string {
  if (!date) return '';
  let d: Date;

  if (date instanceof Date) {
    d = date;
  } else if (date && typeof date.seconds === 'number') { 
    d = new Date(date.seconds * 1000);
  } else if (typeof date === 'string') {
    const parsedDate = new Date(date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        d = new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate());
    } else {
        d = parsedDate;
    }
  } else {
    return ''; 
  }
  
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}


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

export function formatProductDisplay(products: Product[] | undefined): string {
  if (!products || products.length === 0) {
    return 'Custom Order';
  }
  const productNames = products.map(p => p.productName).filter(Boolean) as string[];
  if (productNames.length === 0) {
    return 'Custom Order';
  }
  if (productNames.length === 1) {
    return productNames[0];
  }
  if (productNames.length === 2) {
    return `${productNames[0]} & ${productNames[1]}`;
  }
  return `${productNames[0]} & ${productNames.length - 1} more`;
}

/**
 * Robustly downloads a file by fetching it as a blob and creating an object URL.
 */
export async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    
    // Add to DOM temporarily to ensure child relationship is valid for programmatic clicks
    document.body.appendChild(link);
    link.click();
    
    // Safety check before removal
    if (document.body.contains(link)) {
        document.body.removeChild(link);
    }
    
    setTimeout(() => URL.revokeObjectURL(objectUrl), 200);
  } catch (error) {
    // Fallback for CORS restricted or failed fetches
    window.open(url, '_blank');
  }
}
