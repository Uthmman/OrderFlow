"use client";

import { Search, QrCode } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { UserNav } from "@/components/app/user-nav";
import { Notifications } from "@/components/app/notifications";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QRScannerDialog } from "./qr-scanner-dialog";

export function AppHeader() {
  const { user } = useUser();
  const [scannerOpen, setScannerOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search orders, customers..."
          className="w-full rounded-lg bg-background pl-8 md:w-[300px] lg:w-[400px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setScannerOpen(true)}
          title="Scan QR Code"
        >
          <QrCode className="h-5 w-5" />
        </Button>
        <Notifications />
        <UserNav />
      </div>
      <QRScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </header>
  );
}