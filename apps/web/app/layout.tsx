import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import Providers from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'DocDock — Knock-Knock, your doctor is here.',
    template: '%s | DocDock',
  },
  description: 'Doctor-on-demand home consultation platform. Book verified doctors, track visits live, and manage your health all in one place.',
  keywords: ['doctor', 'consultation', 'home visit', 'healthcare', 'appointment'],
  authors: [{ name: 'DocDock' }],
  openGraph: {
    title: 'DocDock',
    description: 'Book verified doctors for home visits.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('docdock-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
