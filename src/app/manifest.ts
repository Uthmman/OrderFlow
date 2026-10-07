
import { MetadataRoute } from 'next';

/**
 * Dynamically generates the manifest. 
 * We use static values or environment variables here to ensure reliability 
 * across standalone mode and different browsers.
 */
export default function manifest(): MetadataRoute.Manifest {
  const companyName = "OrderFlow";
  // We use a reliable default icon that is always available
  const logoUrl = "https://picsum.photos/seed/orderflow/512/512";

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
