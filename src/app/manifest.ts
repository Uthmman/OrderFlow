
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const companyName = "ZENBABA FURNITURE";

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
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
