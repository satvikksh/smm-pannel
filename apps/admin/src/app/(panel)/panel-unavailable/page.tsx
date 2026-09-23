import { KeyRound } from 'lucide-react';
import { Card } from '@smm/ui';

export default async function PanelUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>;
}) {
  const params = await searchParams;
  const detail = params.detail?.trim();

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <KeyRound className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-foreground">
          This Admin panel is currently unavailable.
        </h1>
        {detail ? (
          <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground">
            {detail}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          Please contact the Super Admin to restore access.
        </p>
      </div>
    </Card>
  );
}
