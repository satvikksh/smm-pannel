import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider, ThemeScript, ToastProvider } from '@smm/ui';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SMM Panel',
    template: '%s · SMM Panel',
  },
  description: 'Buy social media marketing services, manage orders and your wallet.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}