
"use client";

import React, { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { OrderProvider } from "@/hooks/use-orders";
import { CustomerProvider } from "@/hooks/use-customers";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase";
import { NotificationProvider } from "@/hooks/use-notifications";
import { ColorSettingProvider } from "@/hooks/use-color-settings";

const ALLOWED_ROLES = ['Admin', 'Manager', 'Sales', 'Designer'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useUser();
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    // If loading is finished and there's no authenticated user, redirect to login.
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // While Firebase is checking the auth state, show a loading screen.
  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div>Loading session...</div>
        </div>
    );
  }
  
  // After loading, if a user's profile (which contains the role) exists...
  if (user && role) {
    // ...but their role is 'Pending', show the pending approval screen.
    if (role === 'Pending') {
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
    // If the user has a valid role, show the app.
    if (ALLOWED_ROLES.includes(role)) {
        return <>{children}</>;
    }
  }

  // If loading is done and we still don't have a user or a valid role, the useEffect will redirect.
  // This return null prevents rendering children that might depend on the user.
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <CustomerProvider>
          <ColorSettingProvider>
            <OrderProvider>
              <NotificationProvider>
                <div className="flex h-screen w-full flex-col">
                  <AppHeader />
                  <div className="flex flex-1 overflow-hidden">
                    <AppSidebar />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                      <AuthGuard>
                        {children}
                      </AuthGuard>
                    </main>
                  </div>
                </div>
              </NotificationProvider>
            </OrderProvider>
          </ColorSettingProvider>
      </CustomerProvider>
    </SidebarProvider>
  );
}
