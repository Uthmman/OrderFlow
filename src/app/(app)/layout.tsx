
"use client";

import React, { useEffect, type ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { OrderProvider } from "@/hooks/use-orders";
import { CustomerProvider } from "@/hooks/use-customers";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth, useFirebase } from "@/firebase";
import { NotificationProvider } from "@/hooks/use-notifications";
import { ColorSettingProvider } from "@/hooks/use-color-settings";
import { ProductProvider } from "@/hooks/use-products";
import { ProductSettingProvider } from "@/hooks/use-product-settings";
import { PaymentSettingProvider } from "@/hooks/use-payment-settings";
import { StockProvider } from "@/hooks/use-stock";
import { FloatingBottomNav } from "@/components/app/floating-bottom-nav";
import { Loader2 } from "lucide-react";

const ALLOWED_ROLES = ['Admin', 'Manager', 'Sales', 'Designer'];
const PRIMARY_ADMIN_EMAIL = 'zenbabfurniture@gmail.com';

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, role } = useUser();
  const { user: authUser, isUserLoading } = useFirebase();
  const router = useRouter();
  const auth = useAuth();

  const isPrimaryAdmin = authUser?.email === PRIMARY_ADMIN_EMAIL;

  useEffect(() => {
    // Session hardening: Only redirect if loading is completely finished and no user exists.
    if (!isUserLoading && !loading && !authUser && !user) {
      router.replace("/");
    }
  }, [user, authUser, loading, isUserLoading, router]);

  // Loading state remains active until auth check is truly conclusive
  if (isUserLoading || (authUser && loading)) {
    return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Checking Session...</div>
        </div>
    );
  }
  
  if (user && role) {
    if (role === 'Pending' && !isPrimaryAdmin) {
      return (
          <div className="flex items-center justify-center h-screen">
              <Card className="w-full max-w-md m-4">
                  <CardHeader>
                      <CardTitle>Account Pending Approval</CardTitle>
                      <CardDescription>Your account has been created but is currently awaiting administrator approval. Please check back later.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Button onClick={() => auth.signOut()} className="w-full">Log Out</Button>
                  </CardContent>
              </Card>
          </div>
      )
    }
    if (ALLOWED_ROLES.includes(role) || isPrimaryAdmin) {
        return <>{children}</>;
    }
  }

  // Final fallback
  return null;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <CustomerProvider>
            <ColorSettingProvider>
              <ProductSettingProvider>
                <PaymentSettingProvider>
                  <ProductProvider>
                      <OrderProvider>
                      <NotificationProvider>
                          <StockProvider>
                            <div className="flex h-screen w-full flex-col overflow-hidden">
                            <AppHeader />
                            <div className="flex flex-1 overflow-hidden relative">
                                <AppSidebar />
                                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-28 md:pb-6 lg:pb-8">
                                    {children}
                                </main>
                                <FloatingBottomNav />
                            </div>
                            </div>
                          </StockProvider>
                      </NotificationProvider>
                      </OrderProvider>
                  </ProductProvider>
                </PaymentSettingProvider>
              </ProductSettingProvider>
            </ColorSettingProvider>
        </CustomerProvider>
      </SidebarProvider>
    </AuthGuard>
  );
}
