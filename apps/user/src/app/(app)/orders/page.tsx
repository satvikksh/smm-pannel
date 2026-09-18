'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icons,
  LoadingState,
  Pagination,
  Select,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@smm/ui';
import type { Order, Paginated } from '@smm/types';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDate, formatMoney, shortId } from '@/lib/format';

const STATUSES = ['pending', 'processing', 'in_progress', 'completed', 'partial', 'cancelled', 'failed'];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const query = `/user/orders?page=${page}&limit=10${status ? `&status=${status}` : ''}`;
  const orders = useApi<Paginated<Order>>(query);

  const items = orders.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="My orders"
        subtitle="Track the progress of every order you have placed."
        action={
          <Link href="/services">
            <Button icon={<Icons.Plus className="h-4 w-4" />} size="sm">
              New order
            </Button>
          </Link>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
      </div>

      {orders.loading ? (
        <LoadingState label="Loading orders…" />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={orders.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No orders found"
            description="Once you place an order it will appear here."
            action={
              <Link href="/services">
                <Button size="sm">Browse services</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden sm:block">
            <Table>
              <THead>
                <Th>Order</Th>
                <Th>Service</Th>
                <Th>Link</Th>
                <Th>Qty</Th>
                <Th>Price</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </THead>
              <TBody>
                {items.map((order) => (
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
                    <Td className="max-w-[220px] truncate text-muted-foreground">{order.link}</Td>
                    <Td className="tabular-nums">{order.quantity}</Td>
                    <Td className="tabular-nums">{formatMoney(order.price)}</Td>
                    <Td>
                      <StatusBadge status={order.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDate(order.createdAt)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y divide-border sm:hidden">
            {items.map((order) => (
              <li key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${order.id}`}
                      className="block truncate text-sm font-semibold text-foreground"
                    >
                      {order.serviceName}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      #{shortId(order.id)} · {order.quantity} · {formatMoney(order.price)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination
              page={orders.data?.page ?? 1}
              totalPages={orders.data?.totalPages ?? 1}
              onPage={setPage}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
