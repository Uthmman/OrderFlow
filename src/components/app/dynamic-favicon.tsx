'use client';

import { useBrandSettings } from "@/hooks/use-brand-settings";
import { useEffect } from "react";

/**
 * A client component that dynamically updates the browser favicon and 
 * Apple touch icon based on the logo URL provided in the Branding settings.
 */
export function DynamicFavicon() {
  const { settings } = useBrandSettings();

  useEffect(() => {
    // Default to a system placeholder if no logo is uploaded
    const url = settings?.logoUrl || "https://picsum.photos/seed/orderflow/192/192";
    
    const updateIcon = (rel: string) => {
      let link = document.querySelector(`link[rel~='${rel}']`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = url;
      
      // For standard icons, explicitly set type if possible
      if (rel === 'icon' || rel === 'shortcut icon') {
        link.type = 'image/png';
      }
    };

    updateIcon('icon');
    updateIcon('shortcut icon');
    updateIcon('apple-touch-icon');
  }, [settings?.logoUrl]);

  return null;
}
