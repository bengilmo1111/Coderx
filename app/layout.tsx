import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'coderX',
  description: 'Real code, one tap at a time.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // He will play this on a phone in bed. Lock the layout to the viewport.
  maximumScale: 1,
  themeColor: '#fdf6e3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
