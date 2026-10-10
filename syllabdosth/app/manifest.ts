
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
  };
}
