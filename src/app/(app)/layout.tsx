
"use client";

import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { OrderProvider } from "@/hooks/use-orders";
import { CustomerProvider } from "@/hooks/use-customers";
import { initializeFirebase } from "@/firebase";

// Initialize firebase once
initializeFirebase();

export default function AppLayout({ children }: { children: React.ReactNode }) {

  return (
    <SidebarProvider>
      <CustomerProvider>
        <OrderProvider>
          <div className="flex h-screen w-full flex-col">
            <AppHeader />
            <div className="flex flex-1 overflow-hidden">
              <AppSidebar />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                {children}
              </main>
            </div>
          </div>
        </OrderProvider>
      </CustomerProvider>
    </SidebarProvider>
  );
}
