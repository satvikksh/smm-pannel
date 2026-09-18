'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Icons,
  LoadingState,
  StatusBadge,
} from '@smm/ui';
import type { Order } from '@smm/types';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDate, formatMoney, shortId } from '@/lib/format';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  const order = useApi<Order>(`/user/orders/${id}`);

  if (order.loading) return <LoadingState label="Loading order…" />;
  if (order.error || !order.data) {
    return <ErrorState message={order.error ?? 'Order not found.'} onRetry={order.reload} />;
  }

  const data = order.data;
  const progress = data.quantity > 0 ? Math.min(100, Math.round((data.startCounter / data.quantity) * 100)) : 0;

  const rows: { label: string; value: string }[] = [
    { label: 'Order ID', value: `#${shortId(data.id)}` },
    { label: 'Service', value: data.serviceName },
    { label: 'Category', value: data.categoryName || '—' },
    { label: 'Quantity', value: String(data.quantity) },
    { label: 'Start counter', value: String(data.startCounter) },
    { label: 'Remaining', value: String(data.remaining) },
    { label: 'Charge', value: formatMoney(data.price) },
    { label: 'Placed at', value: formatDate(data.createdAt) },
    { label: 'Updated at', value: formatDate(data.updatedAt) },
  ];

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
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-semibold text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target link</p>
            <a
              href={data.link}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-sm font-medium text-primary hover:underline"
            >
              {data.link}
            </a>
          </div>
        </Card>

        <Card>
          <CardHeader title="Progress" subtitle="Delivery status" />
          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
          </div>
          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{data.startCounter} delivered</span>
              <span>{progress}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
