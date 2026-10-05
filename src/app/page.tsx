
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth, useFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Boxes } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useBrandSettings } from '@/hooks/use-brand-settings';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useFirebase();
  const { settings: brandSettings } = useBrandSettings();
  const { toast } = useToast();

  // Immediate redirect if already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      // Transition is handled by AuthGuard and useEffect, but push here for speed
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message || 'Please check your credentials and try again.',
      });
      setLoading(false);
    }
  };

  if (isUserLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-muted/40">
            <Boxes className="h-12 w-12 text-primary animate-bounce" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Session...</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="mx-auto w-full max-w-sm shadow-xl border-none">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
              {brandSettings?.logoUrl ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border bg-white shadow-sm ring-4 ring-white">
                  <Image 
                    src={brandSettings.logoUrl} 
                    alt={brandSettings.companyName || "Logo"} 
                    fill 
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <Boxes className="h-12 w-12 text-primary" />
              )}
          </div>
          <CardTitle className="text-2xl text-center font-headline font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            {brandSettings?.companyName ? `Sign in to ${brandSettings.companyName}` : "Sign in to manage your workshop"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="ml-auto inline-block text-xs underline text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center space-x-2 py-1">
              <Checkbox 
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={loading}
              />
              <Label
                htmlFor="remember-me"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me
              </Label>
            </div>
            <Button type="submit" className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Need an account?{' '}
            <Link href="/signup" className="underline font-bold text-primary">
              Register here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
