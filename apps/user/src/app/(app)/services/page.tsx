'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Modal,
  useToast,
} from '@smm/ui';
import type { Category, Service } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatMoney } from '@/lib/format';

export default function ServicesPage() {
  const toast = useToast();
  const categories = useApi<Category[]>('/user/catalog/categories');
  const services = useApi<Service[]>('/user/catalog/services');
  const [active, setActive] = useState<string>('all');
  const [selected, setSelected] = useState<Service | null>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const list = services.data ?? [];
    if (active === 'all') return list;
    return list.filter((service) => service.categoryId === active);
  }, [services.data, active]);

  function openFor(service: Service) {
    setSelected(service);
    setLink('');
    setQuantity(String(service.minOrder));
    setError(null);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < selected.minOrder || qty > selected.maxOrder) {
      setError(`Quantity must be between ${selected.minOrder} and ${selected.maxOrder}.`);
      return;
    }
    setSubmitting(true);
    try {
      await api('/user/orders', {
        method: 'POST',
        body: JSON.stringify({ serviceId: selected.id, link, quantity: qty }),
      });
      toast.success('Order placed successfully.');
      setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to place the order.');
    } finally {
      setSubmitting(false);
    }
  }

  const total = selected ? Number(quantity || 0) * selected.price : 0;

  return (
    <div>
      <PageHeader title="Services" subtitle="Choose a service and place an order." />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setActive('all')}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
            active === 'all'
              ? 'bg-primary text-primary-foreground shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]'
              : 'bg-card text-muted-foreground ring-1 ring-border'
          }`}
        >
          All
        </button>
        {(categories.data ?? []).map((category) => (
          <button
            key={category.id}
            onClick={() => setActive(category.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              active === category.id
                ? 'bg-primary text-primary-foreground shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]'
                : 'bg-card text-muted-foreground ring-1 ring-border'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {services.loading ? (
        <LoadingState label="Loading services…" />
      ) : services.error ? (
        <ErrorState message={services.error} onRetry={services.reload} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="No services available" description="Please check back later." />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <Card key={service.id} className="flex flex-col">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{service.categoryName || 'Service'}</p>
                <h3 className="mt-1 text-sm font-bold text-foreground">{service.name}</h3>
                {service.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{service.description}</p>
                ) : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <dt>Unit price</dt>
                  <dd className="font-semibold text-foreground">{formatMoney(service.price)}</dd>
                </div>
                <div>
                  <dt>Min / Max</dt>
                  <dd className="font-semibold text-foreground">
                    {service.minOrder} / {service.maxOrder}
                  </dd>
                </div>
              </dl>
              <Button className="mt-4" fullWidth onClick={() => openFor(service)}>
                Order now
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.name : ''}
        description={selected ? `Price ${formatMoney(selected.price)} per unit` : undefined}
      >
        {selected ? (
          <form className="space-y-4" onSubmit={submitOrder}>
            <Field label="Link" htmlFor="order-link" hint="The URL or username to promote.">
              <Input
                id="order-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                required
              />
            </Field>
            <Field
              label="Quantity"
              htmlFor="order-quantity"
              hint={`Between ${selected.minOrder} and ${selected.maxOrder}.`}
            >
              <Input
                id="order-quantity"
                type="number"
                min={selected.minOrder}
                max={selected.maxOrder}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </Field>
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Order total</span>
              <span className="font-bold text-foreground">{formatMoney(total)}</span>
            </div>
            {error ? (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="outline" fullWidth onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button type="submit" fullWidth loading={submitting}>
                Place order
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
