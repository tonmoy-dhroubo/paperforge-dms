import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/design/theme-provider';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';

export const metadata: Metadata = {
  title: 'Paperforge DMS',
  description: 'Internal document management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
