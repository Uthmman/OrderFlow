
"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { Boxes } from "lucide-react"
import { useEffect } from "react"
import Image from "next/image"
import { useUser } from "@/firebase/auth/use-user"
import { useRouter } from "next/navigation"
import type { Role } from "@/lib/types"

export default function LoginPage() {
  const { signInAsDemoUser } = useAuth();
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleDemoLogin = (role: Role) => {
    signInAsDemoUser(role);
  };
  
  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center">
          <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full lg:grid lg:min-h-[100vh] lg:grid-cols-2 xl:min-h-[100vh]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                 <Boxes className="h-8 w-8 text-primary" />
                 <h1 className="text-3xl font-bold font-headline">OrderFlow</h1>
            </div>
             <CardTitle className="text-2xl font-bold">Demo Login</CardTitle>
            <CardDescription>
              Select a role to log in as a demo user.
            </CardDescription>
          </div>
          <Card>
            <CardHeader>
                <CardTitle>Select a Role</CardTitle>
                <CardDescription>Log in as a demo user with a specific role to see different views of the application.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Button onClick={() => handleDemoLogin('Admin')}>Log in as Admin</Button>
                <Button onClick={() => handleDemoLogin('Manager')} variant="secondary">Log in as Manager</Button>
                <Button onClick={() => handleDemoLogin('Sales')} variant="secondary">Log in as Sales</Button>
                <Button onClick={() => handleDemoLogin('Designer')} variant="secondary">Log in as Designer</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="https://picsum.photos/seed/login-bg/1200/1000"
          data-ai-hint="abstract geometric"
          alt="Image"
          width="1200"
          height="1000"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
