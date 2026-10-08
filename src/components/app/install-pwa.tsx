
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useBrandSettings } from '@/hooks/use-brand-settings';
import Image from 'next/image';

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { settings } = useBrandSettings();

  const staticLogo = "https://picsum.photos/seed/zenbab-furniture-icon/192/192";

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

    if (isIphone && !isStandalone) {
      setIsVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

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
    <div className="fixed bottom-24 left-4 right-4 z-[60] md:hidden animate-in slide-in-from-bottom-8 duration-500">
      <Card className="bg-primary text-primary-foreground shadow-2xl border-none overflow-hidden ring-4 ring-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white p-1.5 shrink-0 shadow-inner flex items-center justify-center">
             <Image src={staticLogo} alt="App" width={40} height={40} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Add to Home Screen</p>
            <p className="text-sm font-bold truncate">Install {settings?.companyName || 'OrderFlow'}</p>
          </div>
          <div className="flex items-center gap-2">
            {isIOS ? (
                <div className="flex flex-col items-center text-[9px] font-bold uppercase leading-tight bg-white/10 px-2 py-1 rounded-lg border border-white/20">
                    <div className="flex items-center gap-1">Tap <Share className="h-3 w-3" /></div>
                    <span>then "Add to Home"</span>
                </div>
            ) : (
                <Button size="sm" variant="secondary" onClick={handleInstallClick} className="font-bold h-8 text-xs">
                  Install
                </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white/50 hover:text-white" onClick={() => setIsVisible(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
