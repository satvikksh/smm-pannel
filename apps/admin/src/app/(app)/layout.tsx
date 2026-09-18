import type { ReactNode } from 'react';
import { PortalShell } from '@/components/shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <PortalShell requireLicense>{children}</PortalShell>;
}
