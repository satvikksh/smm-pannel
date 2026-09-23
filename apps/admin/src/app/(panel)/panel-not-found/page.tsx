import { AlertCircle } from 'lucide-react';
import { Card } from '@smm/ui';

export default function PanelNotFoundPage() {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground bg-muted text-muted-foreground">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-foreground">
          Admin panel not found.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This address does not match any Admin panel. Check the link or contact the Super Admin.
        </p>
      </div>
    </Card>
  );
}
