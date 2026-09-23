'use client';

import {
  Badge,
  Card,
  CardHeader,
  ErrorState,
  Icons,
  LoadingState,
  StatCard,
} from '@smm/ui';
import type { PaymentMethod } from '@smm/types';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatMoney } from '@/lib/format';

interface WalletSummary {
  totalUserBalance: number;
  totalDeposited: number;
  totalSpent: number;
  orderValue: number;
  orderCount: number;
}

export default function WalletOverviewPage() {
  const summary = useApi<WalletSummary>('/admin/wallet/summary');
  const methods = useApi<PaymentMethod[]>('/admin/wallet/payment-methods');

  return (
    <div>
      <PageHeader title="Wallet overview" subtitle="Aggregate wallet balances across all users." />

      {summary.loading ? (
        <LoadingState label="Loading wallet summary…" />
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.reload} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="User balance"
            value={formatMoney(summary.data?.totalUserBalance ?? 0)}
            icon={<Icons.Wallet className="h-5 w-5" />}
          />
          <StatCard
            label="Total deposited"
            value={formatMoney(summary.data?.totalDeposited ?? 0)}
            icon={<Icons.Bank className="h-5 w-5" />}
          />
          <StatCard
            label="Total spent"
            value={formatMoney(summary.data?.totalSpent ?? 0)}
            icon={<Icons.Orders className="h-5 w-5" />}
          />
          <StatCard
            label="Order value"
            value={formatMoney(summary.data?.orderValue ?? 0)}
            icon={<Icons.Analytics className="h-5 w-5" />}
            hint={`${summary.data?.orderCount ?? 0} orders`}
          />
        </div>
      )}

      <div className="mt-6">
        <Card>
          <CardHeader title="Payment methods" subtitle="Methods configured by the super admin" />
          {methods.loading ? (
            <LoadingState label="Loading payment methods…" />
          ) : methods.error ? (
            <ErrorState message={methods.error} onRetry={methods.reload} />
          ) : (methods.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment methods configured.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(methods.data ?? []).map((method) => (
                <li key={method.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{method.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{method.instructions || method.code}</p>
                  </div>
                  <Badge>{method.enabled ? 'enabled' : 'disabled'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}