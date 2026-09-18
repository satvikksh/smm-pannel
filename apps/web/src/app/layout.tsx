import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { UserPanelThemeScript, UserPanelThemeProvider, ToastProvider } from '@smm/ui';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SMM Panel',
    template: '%s · SMM Panel',
  },
  description: 'Buy social media marketing services, manage orders and your wallet.',
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <UserPanelThemeScript />
      </head>
      <body>
        <UserPanelThemeProvider apiBase={API_BASE}>
          <ToastProvider>{children}</ToastProvider>
        </UserPanelThemeProvider>
      </body>
    </html>
  );
}