'use client';

import { UserThemeAdminSettings } from '@smm/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

export default function ThemePage() {
  return (
    <div>
      <PageHeader title="Theme" subtitle="Choose the look of the panel your customers see." />
      <UserThemeAdminSettings request={api} />
    </div>
  );
}