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
import { Scan, Camera, XCircle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRScannerDialog({ open, onOpenChange }: QRScannerDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Function to stop the scanner safely
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (open) {
      setCameraError(null);
      
      const startScanner = async () => {
        try {
          // Initialize the core library instance
          const html5QrCode = new Html5Qrcode("qr-reader");
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
              
              // Validate proprietary format
              if (trimmedText.startsWith("ORDERFLOW-ORDER:")) {
                const orderId = trimmedText.split(":")[1];
                if (orderId) {
                  // Vibrate if supported for feedback
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
            (errorMessage) => {
              // Parse errors are expected frequently while searching for a code, we ignore them
            }
          );
          setIsScanning(true);
        } catch (err: any) {
          console.error("Camera start error:", err);
          let message = "Could not access camera.";
          if (err?.name === "NotAllowedError") {
            message = "Camera access denied. Please enable permissions in your browser settings.";
          } else if (err?.name === "NotFoundError") {
            message = "No camera found on this device.";
          }
          setCameraError(message);
          setIsScanning(false);
        }
      };

      // Slight delay to ensure the Dialog is fully rendered in the DOM
      const timer = setTimeout(startScanner, 400);
      
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
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
          <div 
            id="qr-reader" 
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
