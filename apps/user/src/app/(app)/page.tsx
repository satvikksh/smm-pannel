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
import type { Order, Paginated, Service, Wallet } from '@smm/types';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/components/shell';
import { PageHeader } from '@/components/page-header';
import { formatDateShort, formatMoney, shortId } from '@/lib/format';

export default function DashboardPage() {
  const session = useSession();
  const me = useApi<{ user: unknown; wallet?: Wallet }>('/auth/user/me');
  const orders = useApi<Paginated<Order>>('/user/orders?limit=5');
  const services = useApi<Service[]>('/user/catalog/services');

  const wallet = me.data?.wallet;
  const recent = orders.data?.items ?? [];
  const serviceCount = services.data?.length ?? 0;

  return (
    <div>
      <PageHeader
        title={`Hi, ${session?.name?.split(' ')[0] ?? 'there'} 👋`}
        subtitle="Here is a snapshot of your account activity."
        action={
          <Link href="/services">
            <Button icon={<Icons.Plus className="h-4 w-4" />}>New order</Button>
          </Link>
        }
      />

      {me.error ? (
        <ErrorState message={me.error} onRetry={me.reload} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Wallet balance"
            value={wallet ? formatMoney(wallet.balance, wallet.currency) : '—'}
            icon={<Icons.Wallet className="h-5 w-5" />}
            hint={wallet ? `${formatMoney(wallet.totalSpent, wallet.currency)} spent` : undefined}
          />
          <StatCard
            label="Total orders"
            value={orders.data?.total ?? '—'}
            icon={<Icons.Orders className="h-5 w-5" />}
          />
          <StatCard
            label="Deposited"
            value={wallet ? formatMoney(wallet.totalDeposited, wallet.currency) : '—'}
            icon={<Icons.Bank className="h-5 w-5" />}
          />
          <StatCard
            label="Services"
            value={serviceCount || '—'}
            icon={<Icons.Services className="h-5 w-5" />}
            hint="Available to order"
          />
        </div>
      )}

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Recent orders"
            subtitle="Your last 5 orders"
            action={
              <Link href="/orders">
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          {orders.loading ? (
            <LoadingState label="Loading orders…" />
          ) : orders.error ? (
            <ErrorState message={orders.error} onRetry={orders.reload} />
          ) : recent.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Browse the service catalog and place your first order."
              action={
                <Link href="/services">
                  <Button size="sm">Browse services</Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <THead>
                    <Th>Order</Th>
                    <Th>Service</Th>
                    <Th>Qty</Th>
                    <Th>Price</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                  </THead>
                  <TBody>
                    {recent.map((order) => (
                      <Tr key={order.id}>
                        <Td>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            #{shortId(order.id)}
                          </Link>
                        </Td>
                        <Td>{order.serviceName}</Td>
                        <Td className="tabular-nums">{order.quantity}</Td>
                        <Td className="tabular-nums">{formatMoney(order.price)}</Td>
                        <Td>
                          <StatusBadge status={order.status} />
                        </Td>
                        <Td className="text-muted-foreground">{formatDateShort(order.createdAt)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
              <ul className="divide-y divide-border sm:hidden">
                {recent.map((order) => (
                  <li key={order.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="block truncate text-sm font-semibold text-foreground"
                      >
                        {order.serviceName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        #{shortId(order.id)} · {order.quantity} · {formatMoney(order.price)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
