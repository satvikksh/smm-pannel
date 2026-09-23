'use client';

import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Icons,
  LoadingState,
  StatCard,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@smm/ui';
import type { Order, Paginated, SafeUser, Wallet } from '@smm/types';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/components/shell';
import { PageHeader } from '@/components/page-header';
import { formatDateShort, formatMoney, shortId } from '@/lib/format';

interface WalletSummary {
  totalUserBalance: number;
  totalDeposited: number;
  totalSpent: number;
  orderValue: number;
  orderCount: number;
}

export function DashboardOverview() {
  const session = useSession();
  const summary = useApi<WalletSummary>('/admin/wallet/summary');
  const users = useApi<Paginated<SafeUser & { wallet: Wallet | null }>>('/admin/users?limit=5');
  const orders = useApi<Paginated<Order>>('/admin/orders?limit=5');

  return (
    <div>
      <PageHeader
        title={`Admin overview`}
        subtitle={`Signed in as ${session?.name ?? 'admin'}`}
        action={
          <Link href="/orders">
            <Button size="sm" icon={<Icons.Orders className="h-4 w-4" />}>
              Manage orders
            </Button>
          </Link>
        }
      />

      {summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.reload} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="User balance"
            value={summary.data ? formatMoney(summary.data.totalUserBalance) : '—'}
            icon={<Icons.Wallet className="h-5 w-5" />}
          />
          <StatCard
            label="Deposited"
            value={summary.data ? formatMoney(summary.data.totalDeposited) : '—'}
            icon={<Icons.Bank className="h-5 w-5" />}
          />
          <StatCard
            label="Order value"
            value={summary.data ? formatMoney(summary.data.orderValue) : '—'}
            icon={<Icons.Orders className="h-5 w-5" />}
            hint={summary.data ? `${summary.data.orderCount} orders` : undefined}
          />
          <StatCard
            label="Total spent"
            value={summary.data ? formatMoney(summary.data.totalSpent) : '—'}
            icon={<Icons.Analytics className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Newest users"
            action={
              <Link href="/users">
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          {users.loading ? (
            <LoadingState label="Loading users…" />
          ) : users.error ? (
            <ErrorState message={users.error} onRetry={users.reload} />
          ) : (users.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="No users yet" />
          ) : (
            <ul className="divide-y divide-border">
              {(users.data?.items ?? []).map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/users/${user.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:text-primary text-foreground"
                    >
                      {user.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={user.status} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {user.wallet ? formatMoney(user.wallet.balance) : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="p-5 pb-0">
            <CardHeader
              title="Recent orders"
              action={
                <Link href="/orders">
                  <Button variant="outline" size="sm">
                    View all
                  </Button>
                </Link>
              }
            />
          </div>
          {orders.loading ? (
            <div className="p-5">
              <LoadingState label="Loading orders…" />
            </div>
          ) : orders.error ? (
            <div className="p-5">
              <ErrorState message={orders.error} onRetry={orders.reload} />
            </div>
          ) : (orders.data?.items.length ?? 0) === 0 ? (
            <div className="p-5">
              <EmptyState title="No orders yet" />
            </div>
          ) : (
            <Table>
              <THead>
                <Th>Order</Th>
                <Th>Service</Th>
                <Th>Price</Th>
                <Th>Status</Th>
              </THead>
              <TBody>
                {(orders.data?.items ?? []).map((order) => (
                  <Tr key={order.id}>
                    <Td>
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        #{shortId(order.id)}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">{formatDateShort(order.createdAt)}</span>
                    </Td>
                    <Td className="max-w-[160px] truncate">{order.serviceName}</Td>
                    <Td className="tabular-nums">{formatMoney(order.price)}</Td>
                    <Td>
                      <StatusBadge status={order.status} />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
