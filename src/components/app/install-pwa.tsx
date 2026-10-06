
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useBrandSettings } from '@/hooks/use-brand-settings';
import Image from 'next/image';

/**
 * Logic to catch the PWA install event and show a prompt to the user.
 */
export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { settings } = useBrandSettings();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] md:hidden animate-in slide-in-from-bottom-8 duration-500">
      <Card className="bg-primary text-primary-foreground shadow-2xl border-none overflow-hidden ring-4 ring-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white p-1.5 shrink-0 shadow-inner">
            {settings?.logoUrl ? (
                <div className="relative w-full h-full">
                    <Image src={settings.logoUrl} alt="App" fill className="object-contain" />
                </div>
            ) : (
                <div className="w-full h-full bg-primary/10 rounded flex items-center justify-center text-primary font-bold">ZF</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Add to Home Screen</p>
            <p className="text-sm font-bold truncate">Install {settings?.companyName || 'OrderFlow'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleInstallClick} className="font-bold">
              Install
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white/50 hover:text-white" onClick={() => setIsVisible(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
