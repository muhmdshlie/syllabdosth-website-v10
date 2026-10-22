
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Syllabdosth',
    short_name: 'Syllabdosth',
    description: 'Learn with Syllabdosth',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111111',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
