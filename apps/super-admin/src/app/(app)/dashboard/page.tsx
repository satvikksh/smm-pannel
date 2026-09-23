'use client';

import Link from 'next/link';
import {
  Badge,
  BarChart,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Icons,
  LineChart,
  LoadingState,
  StatCard,
  StatusBadge,
} from '@smm/ui';
import type { AnalyticsOverview } from '@smm/types';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/components/shell';
import { PageHeader } from '@/components/page-header';
import { formatDate, formatMoney } from '@/lib/format';

interface ActivityItem {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetLabel: string;
  result: string;
  createdAt: string;
}

export default function DashboardPage() {
  const session = useSession();
  const overview = useApi<AnalyticsOverview>('/super-admin/analytics/overview');
  const activity = useApi<ActivityItem[]>('/super-admin/analytics/recent-activity');

  const data = overview.data;

  return (
    <div>
      <PageHeader
        title="Platform overview"
        subtitle={`Signed in as ${session?.name ?? 'super admin'}`}
        action={
          <Link href="/admins">
            <Button size="sm" icon={<Icons.Plus className="h-4 w-4" />}>
              New admin
            </Button>
          </Link>
        }
      />

      {overview.loading ? (
        <LoadingState label="Loading analytics…" />
      ) : overview.error ? (
        <ErrorState message={overview.error} onRetry={overview.reload} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Users"
              value={data?.totalUsers ?? 0}
              icon={<Icons.Users className="h-5 w-5" />}
            />
            <StatCard
              label="Admins"
              value={data?.totalAdmins ?? 0}
              icon={<Icons.Shield className="h-5 w-5" />}
              hint={`${data?.activeAdmins ?? 0} active · ${data?.suspendedAdmins ?? 0} suspended`}
            />
            <StatCard
              label="Active licenses"
              value={data?.activeLicenses ?? 0}
              icon={<Icons.License className="h-5 w-5" />}
              hint={`${data?.expiredLicenses ?? 0} expired`}
            />
            <StatCard
              label="Revenue"
              value={formatMoney(data?.revenue ?? 0)}
              icon={<Icons.Analytics className="h-5 w-5" />}
              hint={`${data?.completedOrders ?? 0} completed orders`}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Wallet balance"
              value={formatMoney(data?.walletBalance ?? 0)}
              icon={<Icons.Wallet className="h-5 w-5" />}
            />
            <StatCard
              label="Deposited"
              value={formatMoney(data?.totalDeposited ?? 0)}
              icon={<Icons.Bank className="h-5 w-5" />}
            />
            <StatCard
              label="Spent"
              value={formatMoney(data?.totalSpent ?? 0)}
              icon={<Icons.Orders className="h-5 w-5" />}
            />
            <StatCard
              label="Orders"
              value={data?.totalOrders ?? 0}
              icon={<Icons.Orders className="h-5 w-5" />}
              hint={`${data?.pendingOrders ?? 0} pending`}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Revenue" subtitle="Last 14 days" />
              <div className="overflow-x-auto">
                <LineChart
                  data={(data?.revenueByDay ?? []).map((point) => ({
                    label: point.date.slice(5),
                    value: point.amount,
                  }))}
                  format={(value) => formatMoney(value)}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Orders" subtitle="Last 14 days" />
              <BarChart
                data={(data?.ordersByDay ?? []).map((point) => ({
                  label: point.date.slice(5),
                  value: point.count,
                }))}
              />
            </Card>
          </div>
        </>
      )}

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Recent activity"
            subtitle="Latest audit events across the platform"
            action={
              <Link href="/audit-logs">
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          {activity.loading ? (
            <LoadingState label="Loading activity…" />
          ) : activity.error ? (
            <ErrorState message={activity.error} onRetry={activity.reload} />
          ) : (activity.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(activity.data ?? []).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      <span className="font-semibold">{item.actorName}</span>{' '}
                      <span className="text-muted-foreground">{item.action.replace(/_/g, ' ').toLowerCase()}</span>
                      {item.targetLabel ? <span className="text-muted-foreground"> · {item.targetLabel}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{item.actorRole.replace(/_/g, ' ')}</Badge>
                    <StatusBadge status={item.result === 'success' ? 'completed' : 'failed'} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
