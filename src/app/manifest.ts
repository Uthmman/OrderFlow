
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const companyName = "OrderFlow";
  const staticLogo = "https://picsum.photos/seed/zenbab-furniture-icon/512/512";

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
        src: staticLogo,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: staticLogo,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
