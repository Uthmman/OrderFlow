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
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Function to stop and clean up the scanner safely
  const stopAndClear = async () => {
    if (html5QrCodeRef.current) {
      if (html5QrCodeRef.current.isScanning) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (err) {
          console.warn("Scanner stop failed:", err);
        }
      }
      try {
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Scanner clear failed:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    let isMounted = true;
    let timerId: NodeJS.Timeout;

    if (open) {
      setCameraError(null);
      
      // Delay initialization to allow Dialog animation to finish and DOM to be stable
      timerId = setTimeout(async () => {
        if (!containerRef.current || !isMounted) return;

        try {
          // Initialize scanner on the specific div
          const scanner = new Html5Qrcode("orderflow-qr-reader-target");
          html5QrCodeRef.current = scanner;

          const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          await scanner.start(
            { facingMode: "environment" },
            config,
            async (decodedText) => {
              const trimmedText = decodedText.trim();
              
              if (trimmedText.startsWith("ORDERFLOW-ORDER:")) {
                const orderId = trimmedText.split(":")[1];
                if (orderId && isMounted) {
                  if (navigator.vibrate) navigator.vibrate(100);
                  
                  // Stop scanning first
                  await stopAndClear();
                  
                  if (isMounted) {
                    onOpenChange(false);
                    router.push(`/orders/${orderId}`);
                  }
                }
              } else {
                toast({
                  variant: "destructive",
                  title: "Unsupported Code",
                  description: "This QR code is not recognized. Please scan an internal OrderFlow code.",
                });
              }
            },
            () => {
              // Expected noise during scanning
            }
          );

          if (isMounted) setIsScanning(true);
        } catch (err: any) {
          console.error("Camera start error:", err);
          if (isMounted) {
            let message = "Could not access camera.";
            if (err?.name === "NotAllowedError") {
              message = "Camera access denied. Please check permissions.";
            } else if (err?.name === "NotFoundError") {
              message = "No camera found on this device.";
            }
            setCameraError(message);
            setIsScanning(false);
          }
        }
      }, 500);
    }

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      stopAndClear();
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
            Point your camera at an internal OrderFlow QR code.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          {/* 
              We use a nested div structure. The inner 'target' is what html5-qrcode
              manipulates. The 'container' ref helps us manage lifecycle safely.
          */}
          <div 
            ref={containerRef}
            className="w-full aspect-square overflow-hidden rounded-xl border-2 border-dashed bg-black relative flex items-center justify-center"
          >
             <div id="orderflow-qr-reader-target" className="w-full h-full" />
             
             {!isScanning && !cameraError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 gap-3 bg-black">
                     <Loader2 className="h-10 w-10 animate-spin opacity-50" />
                     <p className="text-sm opacity-70">Initializing camera...</p>
                 </div>
             )}
             
             {cameraError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-6 bg-black text-center gap-2">
                     <XCircle className="h-10 w-10 mb-2" />
                     <p className="text-sm font-bold">Camera Error</p>
                     <p className="text-xs opacity-80 mb-4">{cameraError}</p>
                     <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                         Close
                     </Button>
                 </div>
             )}
             
             {isScanning && (
                 <div className="absolute inset-0 pointer-events-none border-2 border-primary/30 rounded-xl animate-pulse" />
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
