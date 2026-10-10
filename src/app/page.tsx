
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
import { Loader2, Boxes, ShieldCheck, Warehouse } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useFirebase();
  const { toast } = useToast();

  const staticLogo = "/logo.png";
  const brandName = "Zenbaba Furniture";

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

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: 'Please check your credentials and try again.',
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
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-muted/40">
      {/* Brand Side (Desktop) */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        {/* Abstract background shape */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <Warehouse className="w-[800px] h-[800px] -mr-40 -mt-40 rotate-12" />
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white p-2 shadow-lg flex items-center justify-center overflow-hidden">
                    <Image 
                        src={staticLogo} 
                        alt="Logo" 
                        width={48} 
                        height={48} 
                        className="object-contain"
                        onError={(e) => {
                            (e.target as any).src = "https://picsum.photos/seed/orderflow/192/192";
                        }}
                    />
                </div>
                <span className="text-2xl font-black font-headline tracking-tighter uppercase">
                    {brandName}
                </span>
            </div>
        </div>

        <div className="relative z-10 max-w-md">
            <h1 className="text-5xl font-black font-headline tracking-tighter mb-6 leading-tight">
                Crafting excellence, managing precision.
            </h1>
            <p className="text-lg opacity-80 font-medium leading-relaxed">
                The unified workshop management platform for modern furniture manufacturing.
            </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
            <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-primary bg-primary-foreground/10" />
                ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60">Trusted by top workshops</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 lg:p-24 bg-background">
        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <div className="relative h-20 w-20 overflow-hidden rounded-3xl border bg-white shadow-xl ring-8 ring-muted/20 mb-6 flex items-center justify-center">
                <Image 
                    src={staticLogo} 
                    alt="Logo" 
                    width={80} 
                    height={80} 
                    className="object-contain p-2"
                    onError={(e) => {
                        (e.target as any).src = "https://picsum.photos/seed/orderflow/192/192";
                    }}
                />
            </div>
            <h2 className="text-3xl font-black font-headline tracking-tighter text-slate-900">
                {brandName}
            </h2>
            <p className="text-muted-foreground font-medium mt-2">Workshop Control Center</p>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl lg:text-3xl font-black font-headline tracking-tighter text-slate-900">Sign In</h1>
            <p className="text-muted-foreground text-sm font-medium">Enter your credentials to access your workspace.</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12 bg-muted/20 border-none focus-visible:ring-primary shadow-inner"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-500">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-12 bg-muted/20 border-none focus-visible:ring-primary shadow-inner"
                />
              </div>
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
                className="text-xs font-bold text-slate-600 cursor-pointer select-none"
              >
                Keep me signed in
              </Label>
            </div>

            <Button 
                type="submit" 
                className="w-full h-12 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" 
                disabled={loading}
            >
              {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authenticating...</span>
                  </div>
              ) : "Enter Workspace"}
            </Button>
          </form>

          <div className="pt-6 text-center">
            <p className="text-xs text-muted-foreground font-medium">
              New team member?{' '}
              <Link href="/signup" className="text-primary font-black uppercase tracking-widest hover:underline ml-1">
                Register
              </Link>
            </p>
          </div>
          
          <div className="pt-8 flex items-center justify-center gap-2 opacity-30 grayscale pointer-events-none">
             <ShieldCheck className="h-4 w-4" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Enterprise Access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
