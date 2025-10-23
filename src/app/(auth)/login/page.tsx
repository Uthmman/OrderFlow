
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
import { Boxes, Chrome } from "lucide-react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useUser } from "@/firebase/auth/use-user"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const { user, loading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);
  
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email, password);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
          <div className="text-xl">Loading...</div>
      </div>
    )
  }

  // If the user is already logged in, don't render the form
  if (user) {
    return null;
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
             <CardTitle className="text-2xl font-bold">Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account
            </CardDescription>
          </div>
          <form onSubmit={handleEmailSignIn}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </div>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                Or continue with
                </span>
            </div>
          </div>
            <Button variant="outline" onClick={signInWithGoogle} className="w-full">
                <Chrome className="mr-2 h-4 w-4" />
                Sign in with Google
            </Button>
          
           <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Sign up
            </Link>
          </div>
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
