'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Icons,
  Input,
  LoadingState,
  Select,
  StatusBadge,
  useToast,
} from '@smm/ui';
import type { Order } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDate, formatMoney, shortId } from '@/lib/format';

const UPDATABLE = ['processing', 'in_progress', 'completed', 'partial', 'cancelled', 'failed'];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  const toast = useToast();
  const order = useApi<Order>(`/admin/orders/${id}`);

  const [status, setStatus] = useState('processing');
  const [startCounter, setStartCounter] = useState('');
  const [remaining, setRemaining] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order.data) {
      setStatus(UPDATABLE.includes(order.data.status) ? order.data.status : 'processing');
      setStartCounter(String(order.data.startCounter));
      setRemaining(String(order.data.remaining));
    }
  }, [order.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          startCounter: startCounter === '' ? undefined : Number(startCounter),
          remaining: remaining === '' ? undefined : Number(remaining),
        }),
      });
      toast.success('Order updated.');
      order.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update the order.');
    } finally {
      setSaving(false);
    }
  }

  if (order.loading) return <LoadingState label="Loading order…" />;
  if (order.error || !order.data) {
    return <ErrorState message={order.error ?? 'Order not found.'} onRetry={order.reload} />;
  }

  const data = order.data;
  const progress = data.quantity > 0 ? Math.min(100, Math.round((data.startCounter / data.quantity) * 100)) : 0;

  return (
    <div>
      <PageHeader
        title={`Order #${shortId(data.id)}`}
        subtitle={data.serviceName}
        action={
          <Link href="/orders">
            <Button variant="outline" size="sm" icon={<Icons.ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Order details" />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              { label: 'Customer', value: data.userName || '—' },
              { label: 'Category', value: data.categoryName || '—' },
              { label: 'Quantity', value: String(data.quantity) },
              { label: 'Charge', value: formatMoney(data.price) },
              { label: 'Start counter', value: String(data.startCounter) },
              { label: 'Remaining', value: String(data.remaining) },
              { label: 'Placed', value: formatDate(data.createdAt) },
              { label: 'Updated', value: formatDate(data.updatedAt) },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800"
              >
                <dt className="text-sm text-zinc-500 dark:text-zinc-400">{row.label}</dt>
                <dd className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Target link</p>
            <a
              href={data.link}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {data.link}
            </a>
          </div>
        </Card>

        <Card>
          <CardHeader title="Update status" subtitle={`Current: ${data.status.replace(/_/g, ' ')}`} />
          <div className="mb-4 flex items-center gap-3">
            <StatusBadge status={data.status} />
            <span className="text-xs text-zinc-500">{progress}% delivered</span>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Status" htmlFor="order-status">
              <Select id="order-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {UPDATABLE.map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start counter" htmlFor="order-start">
              <Input
                id="order-start"
                type="number"
                min={0}
                value={startCounter}
                onChange={(e) => setStartCounter(e.target.value)}
              />
            </Field>
            <Field label="Remaining" htmlFor="order-remaining" hint="Set to 0 when completed.">
              <Input
                id="order-remaining"
                type="number"
                min={0}
                value={remaining}
                onChange={(e) => setRemaining(e.target.value)}
              />
            </Field>
            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            ) : null}
            <Button type="submit" fullWidth loading={saving}>
              Save changes
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}