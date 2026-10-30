import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Bodoni_Moda, Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeProvider, THEME_SCRIPT } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/providers/AuthProvider';

// The logo's two voices: a high-contrast serif and a plain grotesque. `latin-ext` carries the ₦.
const sans = Hanken_Grotesk({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' });
const display = Bodoni_Moda({ subsets: ['latin', 'latin-ext'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://paadhyvex.com'),
  title: { default: 'PAADhyvex', template: '%s | PAADhyvex' },
  description: 'Free sanitary pads, cycle tracking and support for girls and women in Sabogida Ora and beyond. One pad at a time.',
  applicationName: 'PAADhyvex',
  icons: { icon: [{ url: '/paadhyvex_mark.svg', type: 'image/svg+xml' }] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets the theme before first paint, so a dark-mode visitor never sees a white flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>{children}</AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
