"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Scan } from "lucide-react";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRScannerDialog({ open, onOpenChange }: QRScannerDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (open) {
      const startScanner = () => {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            const trimmedText = decodedText.trim();
            // Handle proprietary app format
            if (trimmedText.startsWith("ORDERFLOW-ORDER:")) {
                const orderId = trimmedText.split(":")[1];
                if (orderId) {
                  scanner.clear().then(() => {
                    onOpenChange(false);
                    router.push(`/orders/${orderId}`);
                  }).catch(() => {
                    onOpenChange(false);
                    router.push(`/orders/${orderId}`);
                  });
                }
            } else {
                 toast({
                  variant: "destructive",
                  title: "Unsupported Code",
                  description: "This QR code is not recognized by OrderFlow. Please scan an internal order code.",
                });
            }
          },
          (errorMessage) => {
            // parse error, ignore it.
          }
        );
        scannerRef.current = scanner;
      };

      // Slight delay to ensure DOM is ready
      const timer = setTimeout(startScanner, 100);
      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
        }
      };
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
            Point your camera at an internal OrderFlow QR code to open it instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <div id="qr-reader" className="w-full overflow-hidden rounded-lg border bg-muted" />
        </div>
      </DialogContent>
    </Dialog>
  );
}