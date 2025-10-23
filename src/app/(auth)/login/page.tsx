
"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import type { Role } from "@/lib/types"
import { Boxes } from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useUser } from "@/firebase/auth/use-user";
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const { signInWithGoogle, signInAsMockUser } = useAuth();
  const { user, loading } = useUser();
  const [role, setRole] = useState<Role>("Manager");
  const router = useRouter();


  useEffect(() => {
    if(!loading && user) {
        router.push('/dashboard');
    }
  }, [user, loading, router])

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    signInAsMockUser(role);
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
            <p className="text-balance text-muted-foreground">
              Sign in to your account to continue (Demo Mode)
            </p>
          </div>
            
              <form onSubmit={handleMockLogin} className="grid gap-4">
                <div className="grid gap-2">
                    <Label>Login As</Label>
                    <Select onValueChange={(value: Role) => setRole(value)} defaultValue={role}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role to log in as" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Designer">Designer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button type="submit" className="w-full">
                    Login as {role}
                </Button>
              </form>
          
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
