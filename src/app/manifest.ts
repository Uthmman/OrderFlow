
import { MetadataRoute } from 'next';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

/**
 * Dynamically generates the manifest based on branding settings.
 * This ensures the app name and icon match your custom logo on the home screen.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let companyName = "OrderFlow";
  let logoUrl = "https://picsum.photos/seed/orderflow/192/192";

  try {
    // Attempt to fetch current branding from Firestore
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);
    const settingsDoc = await getDoc(doc(db, 'settings', 'branding'));
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      if (data.companyName) companyName = data.companyName;
      if (data.logoUrl) logoUrl = data.logoUrl;
    }
  } catch (error) {
    console.warn("Manifest generation: fallback to defaults", error);
  }

  return {
    name: companyName,
    short_name: companyName,
    description: `Workshop management for ${companyName}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4355b9',
    icons: [
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
