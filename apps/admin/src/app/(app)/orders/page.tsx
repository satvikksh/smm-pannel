'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icons,
  Input,
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
  useToast,
} from '@smm/ui';
import type { Order, Paginated } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDateShort, formatMoney, shortId } from '@/lib/format';

const FILTERS = ['pending', 'processing', 'in_progress', 'completed', 'partial', 'cancelled', 'failed'];
const UPDATABLE = ['processing', 'in_progress', 'completed', 'partial', 'cancelled', 'failed'];

export default function OrdersPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const query = `/admin/orders?page=${page}&limit=10&search=${encodeURIComponent(search)}${
    status ? `&status=${status}` : ''
  }`;
  const orders = useApi<Paginated<Order>>(query);

  async function changeStatus(order: Order, next: string) {
    setUpdating(order.id);
    try {
      await api(`/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(`Order marked ${next.replace(/_/g, ' ')}.`);
      orders.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update order.');
    } finally {
      setUpdating(null);
    }
  }

  const items = orders.data?.items ?? [];

  return (
    <div>
      <PageHeader title="Orders" subtitle="Review and update customer orders." />

      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput);
          setPage(1);
        }}
      >
        <div className="flex-1">
          <Input
            placeholder="Search by service, link or user…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="sm:w-48">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {FILTERS.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" icon={<Icons.Search className="h-4 w-4" />}>
          Search
        </Button>
      </form>

      {orders.loading ? (
        <LoadingState label="Loading orders…" />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={orders.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="No orders found" description="Try adjusting your search or filters." />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden lg:block">
            <Table>
              <THead>
                <Th>Order</Th>
                <Th>User</Th>
                <Th>Service</Th>
                <Th>Qty</Th>
                <Th>Price</Th>
                <Th>Status</Th>
                <Th>Update</Th>
              </THead>
              <TBody>
                {items.map((order) => (
                  <Tr key={order.id}>
                    <Td>
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        #{shortId(order.id)}
                      </Link>
                      <p className="text-xs text-zinc-400">{formatDateShort(order.createdAt)}</p>
                    </Td>
                    <Td className="text-zinc-500">{order.userName || '—'}</Td>
                    <Td className="max-w-[180px] truncate">{order.serviceName}</Td>
                    <Td className="tabular-nums">{order.quantity}</Td>
                    <Td className="tabular-nums">{formatMoney(order.price)}</Td>
                    <Td>
                      <StatusBadge status={order.status} />
                    </Td>
                    <Td>
                      <div className="w-40">
                        <Select
                          value={order.status}
                          disabled={updating === order.id}
                          onChange={(e) => changeStatus(order, e.target.value)}
                          className="py-1.5 text-xs"
                        >
                          {order.status === 'pending' ? <option value="pending">pending</option> : null}
                          {UPDATABLE.map((value) => (
                            <option key={value} value={value}>
                              {value.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y divide-zinc-100 lg:hidden dark:divide-zinc-800">
            {items.map((order) => (
              <li key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${order.id}`}
                      className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100"
                    >
                      {order.serviceName}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      #{shortId(order.id)} · {order.userName || 'user'} · {formatMoney(order.price)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination page={orders.data?.page ?? 1} totalPages={orders.data?.totalPages ?? 1} onPage={setPage} />
          </div>
        </Card>
      )}
    </div>
  );
}