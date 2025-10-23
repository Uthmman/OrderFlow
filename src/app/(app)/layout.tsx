
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { OrderProvider } from "@/hooks/use-orders";
import { useUser } from "@/firebase/auth/use-user";
import { CustomerProvider } from "@/hooks/use-customers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // If loading is false and there's still no user, we'll be redirecting,
  // so we can render null or a loading indicator to prevent flashing content.
  if (!user) {
    return null;
  }

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
