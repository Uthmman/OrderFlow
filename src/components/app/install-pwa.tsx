
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Share } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const staticLogo = "/logo.png";
  const brandName = "ZENBABA FURNITURE";

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    
    setIsIOS(isIphone);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, manual check because beforeinstallprompt isn't supported
    if (isIphone && !isStandalone) {
      setIsVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // 5 Second Auto-Hide Logic
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex justify-center animate-in slide-in-from-top-full duration-500">
      <Card className="w-full max-w-sm bg-primary text-primary-foreground shadow-2xl border-none overflow-hidden ring-4 ring-primary/20 rounded-2xl">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white p-1.5 shrink-0 shadow-inner flex items-center justify-center">
             <Image 
                src={staticLogo} 
                alt="App" 
                width={32} 
                height={32} 
                className="object-contain"
                onError={(e) => {
                    (e.target as any).src = "https://picsum.photos/seed/orderflow/192/192";
                }}
             />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-70">Experience App</p>
            <p className="text-xs font-bold truncate">Add {brandName} to Home</p>
          </div>
          <div className="flex items-center gap-2">
            {isIOS ? (
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase bg-white/10 px-2 py-1.5 rounded-lg border border-white/20">
                    <Share className="h-3 w-3" />
                    <span>Share</span>
                </div>
            ) : (
                <Button size="sm" variant="secondary" onClick={handleInstallClick} className="font-bold h-7 text-[10px] px-3">
                  Install
                </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7 text-white/50 hover:text-white" onClick={() => setIsVisible(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
