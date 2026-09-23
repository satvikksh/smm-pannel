import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminPanelThemeProvider, AdminPanelThemeScript, ToastProvider } from '@smm/ui';
import { getApiBase } from '@/lib/api';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SMM Panel',
    template: '%s · SMM Panel',
  },
  description: 'Manage admins, licenses, catalog, payments and the global platform theme.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <AdminPanelThemeScript />
      </head>
      <body>
        <AdminPanelThemeProvider apiBase={getApiBase()} endpoint="/public/theme">
          <ToastProvider>{children}</ToastProvider>
        </AdminPanelThemeProvider>
      </body>
    </html>
  );
}