'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
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
  useToast,
} from '@smm/ui';
import type { EngagementBundleCatalog, EngagementBundlePublic, EngagementBundleType } from '@smm/types';
import { ENGAGEMENT_BUNDLE_TYPE_LABELS } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatMoney } from '@/lib/format';

const TABS: EngagementBundleType[] = ['likes', 'views', 'subscribers'];

const TYPE_ICONS: Record<EngagementBundleType, ReactNode> = {
  likes: <Icons.Bolt className="h-5 w-5" />,
  views: <Icons.Eye className="h-5 w-5" />,
  subscribers: <Icons.CheckBadge className="h-5 w-5" />,
};

export default function EngagementPage() {
  const toast = useToast();
  const catalog = useApi<EngagementBundleCatalog>('/user/catalog/bundles');
  const [active, setActive] = useState<EngagementBundleType>('likes');
  const [selected, setSelected] = useState<EngagementBundlePublic | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bundles = useMemo(() => catalog.data?.[active] ?? [], [catalog.data, active]);

  function openFor(bundle: EngagementBundlePublic) {
    setSelected(bundle);
    setLink('');
    setError(null);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      await api('/user/orders/bundle', {
        method: 'POST',
        body: JSON.stringify({ bundleId: selected.id, link }),
      });
      toast.success('Order placed successfully.');
      setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to place the order.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Engagement"
        subtitle="Pick a package. Prices are set by the panel."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active === tab
                ? 'bg-primary text-primary-foreground shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]'
                : 'bg-card text-muted-foreground ring-1 ring-border hover:text-foreground'
            }`}
          >
            {ENGAGEMENT_BUNDLE_TYPE_LABELS[tab]}
          </button>
        ))}
      </div>

      {catalog.loading ? (
        <LoadingState label="Loading packages…" />
      ) : catalog.error ? (
        <ErrorState message={catalog.error} onRetry={catalog.reload} />
      ) : bundles.length === 0 ? (
        <Card>
          <EmptyState
            title={`No ${ENGAGEMENT_BUNDLE_TYPE_LABELS[active].toLowerCase()} packages`}
            description="Packages for this category aren't available right now. Please check back later."
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <Card key={bundle.id} className="flex flex-col">
              <div className="flex-1">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {TYPE_ICONS[bundle.type]}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {ENGAGEMENT_BUNDLE_TYPE_LABELS[bundle.type]}
                </p>
                <h3 className="mt-1 text-sm font-bold text-foreground">{bundle.displayName}</h3>
                {bundle.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{bundle.description}</p>
                ) : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <dt>Quantity</dt>
                  <dd className="font-semibold text-foreground">{bundle.quantity.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd className="font-semibold text-foreground">{formatMoney(bundle.price, bundle.currency)}</dd>
                </div>
              </dl>
              <Button className="mt-4" fullWidth onClick={() => openFor(bundle)}>
                Select
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.displayName : ''}
        description={selected ? `Fixed package — ${selected.quantity.toLocaleString()} ${ENGAGEMENT_BUNDLE_TYPE_LABELS[selected.type].toLowerCase()}` : undefined}
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
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Package total</span>
              <span className="font-bold text-foreground">{formatMoney(selected.price, selected.currency)}</span>
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