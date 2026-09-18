import { AlertCircle } from 'lucide-react';
import { Card } from '@smm/ui';

export default function PanelNotFoundPage() {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Admin panel not found.
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          This address does not match any Admin panel. Check the link or contact the Super Admin.
        </p>
      </div>
    </Card>
  );
}
