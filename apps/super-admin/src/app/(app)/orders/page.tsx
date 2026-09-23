'use client';

import { useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Icons,
  Input,
  LoadingState,
  Modal,
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

  const orders = useApi<Paginated<Order>>(
    `/super-admin/orders?page=${page}&limit=10&search=${encodeURIComponent(search)}${
      status ? `&status=${status}` : ''
    }`,
  );

  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState({ status: 'processing', startCounter: '', remaining: '' });
  const [saving, setSaving] = useState(false);

  function openEdit(order: Order) {
    setEditing(order);
    setForm({
      status: UPDATABLE.includes(order.status) ? order.status : 'processing',
      startCounter: String(order.startCounter),
      remaining: String(order.remaining),
    });
  }

  async function changeStatus(order: Order, next: string) {
    setUpdating(order.id);
    try {
      await api(`/super-admin/orders/${order.id}/status`, {
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

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/super-admin/orders/${editing.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: form.status,
          startCounter: form.startCounter === '' ? undefined : Number(form.startCounter),
          remaining: form.remaining === '' ? undefined : Number(form.remaining),
        }),
      });
      toast.success('Order updated.');
      setEditing(null);
      orders.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update order.');
    } finally {
      setSaving(false);
    }
  }

  const items = orders.data?.items ?? [];

  return (
    <div>
      <PageHeader title="Orders" subtitle="Every order placed across the platform." />

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
                      <span className="font-semibold text-foreground">#{shortId(order.id)}</span>
                      <p className="text-xs text-muted-foreground">{formatDateShort(order.createdAt)}</p>
                    </Td>
                    <Td className="text-muted-foreground">{order.userName || '—'}</Td>
                    <Td className="max-w-[180px] truncate">{order.serviceName}</Td>
                    <Td className="tabular-nums">{order.quantity}</Td>
                    <Td className="tabular-nums">{formatMoney(order.price)}</Td>
                    <Td>
                      <StatusBadge status={order.status} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
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
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Icons.Edit className="h-4 w-4" />}
                          onClick={() => openEdit(order)}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y divide-border lg:hidden dark:divide-border">
            {items.map((order) => (
              <li key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {order.serviceName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{shortId(order.id)} · {order.userName || 'user'} · {formatMoney(order.price)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  icon={<Icons.Edit className="h-4 w-4" />}
                  onClick={() => openEdit(order)}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination page={orders.data?.page ?? 1} totalPages={orders.data?.totalPages ?? 1} onPage={setPage} />
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Order #${shortId(editing.id)}` : 'Order'}
        description={editing?.serviceName}
      >
        {editing ? (
          <form className="space-y-4" onSubmit={saveEdit}>
            <Field label="Status" htmlFor="order-status">
              <Select
                id="order-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {form.status === 'pending' ? <option value="pending">pending</option> : null}
                {UPDATABLE.map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start counter" htmlFor="order-start">
                <Input
                  id="order-start"
                  type="number"
                  min="0"
                  value={form.startCounter}
                  onChange={(e) => setForm((f) => ({ ...f, startCounter: e.target.value }))}
                />
              </Field>
              <Field label="Remaining" htmlFor="order-remaining">
                <Input
                  id="order-remaining"
                  type="number"
                  min="0"
                  value={form.remaining}
                  onChange={(e) => setForm((f) => ({ ...f, remaining: e.target.value }))}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" fullWidth onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" fullWidth loading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}