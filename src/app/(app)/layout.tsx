
"use client";

import React, { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { OrderProvider } from "@/hooks/use-orders";
import { CustomerProvider } from "@/hooks/use-customers";
import { UserProvider, useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useUser();
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    // If loading is finished and there's still no authenticated user, redirect to login.
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // While Firebase is checking the auth state, show a loading screen.
  // This is the key change: we wait until `loading` is false.
  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div>Loading session...</div>
        </div>
    );
  }
  
  // After loading, if a user exists...
  if (user) {
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
    // If the user has a valid role (not 'Pending'), show the app.
    if (role) {
        return <>{children}</>;
    }
  }

  // If none of the above conditions are met (e.g., finished loading, no user),
  // this will be null and the useEffect will handle the redirect.
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <UserProvider>
        <AuthGuard>
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
        </AuthGuard>
      </UserProvider>
    </FirebaseClientProvider>
  );
}
