"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Scan, XCircle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRScannerDialog({ open, onOpenChange }: QRScannerDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Function to stop the scanner safely
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        // After stopping, we clear the internal state of the library
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Clean stop failed (likely already unmounted or stopping):", err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (open) {
      setCameraError(null);
      
      const startScanner = async () => {
        // Ensure the ref is available
        if (!readerRef.current) return;

        try {
          // Initialize the core library instance using the DOM element ref
          const html5QrCode = new Html5Qrcode(readerRef.current.id);
          html5QrCodeRef.current = html5QrCode;

          const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              const trimmedText = decodedText.trim();
              
              if (trimmedText.startsWith("ORDERFLOW-ORDER:")) {
                const orderId = trimmedText.split(":")[1];
                if (orderId) {
                  if (navigator.vibrate) navigator.vibrate(100);
                  
                  stopScanner().then(() => {
                    onOpenChange(false);
                    router.push(`/orders/${orderId}`);
                  });
                }
              } else {
                toast({
                  variant: "destructive",
                  title: "Unsupported Code",
                  description: "This QR code is not recognized by OrderFlow. Please scan an internal code.",
                });
              }
            },
            () => {
              // Parse errors are expected while searching
            }
          );
          setIsScanning(true);
        } catch (err: any) {
          console.error("Camera start error:", err);
          let message = "Could not access camera.";
          if (err?.name === "NotAllowedError") {
            message = "Camera access denied. Please enable permissions.";
          } else if (err?.name === "NotFoundError") {
            message = "No camera found on this device.";
          }
          setCameraError(message);
          setIsScanning(false);
        }
      };

      // Delay to ensure Dialog transition is done and DOM is stable
      timeoutId = setTimeout(startScanner, 450);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      stopScanner();
    };
  }, [open, router, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" /> Scan Order QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at an internal OrderFlow QR code to open the order details instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          {/* We use a fixed ID for the library but rely on readerRef for lifecycle */}
          <div 
            ref={readerRef}
            id="orderflow-qr-reader" 
            className="w-full aspect-square overflow-hidden rounded-xl border-2 border-dashed bg-black relative flex items-center justify-center"
          >
             {!isScanning && !cameraError && (
                 <div className="text-white text-center p-4 flex flex-col items-center gap-3">
                     <Loader2 className="h-10 w-10 animate-spin opacity-50" />
                     <p className="text-sm opacity-70">Starting camera...</p>
                 </div>
             )}
             {cameraError && (
                 <div className="text-destructive text-center p-6 bg-destructive/5 w-full h-full flex flex-col items-center justify-center gap-2">
                     <XCircle className="h-10 w-10 mb-2" />
                     <p className="text-sm font-bold">Camera Access Required</p>
                     <p className="text-xs opacity-80 max-w-[220px] mb-4">{cameraError}</p>
                     <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                         Close Scanner
                     </Button>
                 </div>
             )}
             {isScanning && (
                 <div className="absolute inset-0 pointer-events-none border-2 border-primary/30 rounded-lg animate-pulse" />
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
