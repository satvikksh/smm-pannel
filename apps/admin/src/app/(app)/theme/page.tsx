'use client';

import { AdminPanelThemeSettings, UserThemeAdminSettings } from '@smm/ui';
import { api } from '@/lib/api';
import { useSession } from '@/components/shell';
import { PageHeader } from '@/components/page-header';

export default function ThemePage() {
  const session = useSession();
  const readOnly = session?.role !== 'admin';

  return (
    <div>
      <PageHeader title="Theme" subtitle="Choose the look of the panel your customers see." />
      <div className="space-y-6">
        <AdminPanelThemeSettings request={api} readOnly={readOnly} />
        <UserThemeAdminSettings request={api} />
      </div>
    </div>
  );
}