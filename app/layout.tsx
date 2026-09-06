import type { Metadata, Viewport } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import './globals.css';

/**
 * The Gilmore Games house typefaces.
 *
 * Loaded through next/font rather than a stylesheet link: it self-hosts them at
 * build time, so there is no request to Google on a phone with bad wifi and no
 * flash of the fallback before the real thing arrives.
 */
const display = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
});

const body = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'coderX',
  description: 'Real code, one tap at a time.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // He will play this on a phone in bed. Lock the layout to the viewport.
  maximumScale: 1,
  themeColor: '#6ec5e9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
