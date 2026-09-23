'use client';

import { useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  ConfirmDialog,
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
  Textarea,
  Th,
  THead,
  Tr,
  useToast,
} from '@smm/ui';
import type {
  EngagementBundle,
  EngagementBundleCurrency,
  EngagementBundleType,
  Paginated,
} from '@smm/types';
import { ENGAGEMENT_BUNDLE_CURRENCIES, ENGAGEMENT_BUNDLE_TYPE_LABELS } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatMoney } from '@/lib/format';

const TABS: { key: 'all' | EngagementBundleType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'likes', label: ENGAGEMENT_BUNDLE_TYPE_LABELS.likes },
  { key: 'views', label: ENGAGEMENT_BUNDLE_TYPE_LABELS.views },
  { key: 'subscribers', label: ENGAGEMENT_BUNDLE_TYPE_LABELS.subscribers },
];

interface FormState {
  type: EngagementBundleType;
  displayName: string;
  quantity: string;
  price: string;
  currency: EngagementBundleCurrency;
  description: string;
  sortOrder: string;
  status: 'active' | 'inactive';
}

const EMPTY: FormState = {
  type: 'likes',
  displayName: '',
  quantity: '',
  price: '',
  currency: 'INR',
  description: '',
  sortOrder: '0',
  status: 'active',
};

export default function EngagementPricingPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'all' | EngagementBundleType>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const query = new URLSearchParams({ page: String(page), limit: '10' });
  if (tab !== 'all') query.set('type', tab);
  if (statusFilter !== 'all') query.set('status', statusFilter);
  if (search) query.set('search', search);

  const bundles = useApi<Paginated<EngagementBundle>>(
    `/super-admin/engagement-bundles?${query.toString()}`,
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EngagementBundle | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<EngagementBundle | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const items = bundles.data?.items ?? [];

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, type: tab === 'all' ? 'likes' : tab });
    setError(null);
    setOpen(true);
  }

  function openEdit(bundle: EngagementBundle) {
    setEditing(bundle);
    setForm({
      type: bundle.type,
      displayName: bundle.displayName,
      quantity: String(bundle.quantity),
      price: String(bundle.price),
      currency: bundle.currency as EngagementBundleCurrency,
      description: bundle.description,
      sortOrder: String(bundle.sortOrder),
      status: bundle.status,
    });
    setError(null);
    setOpen(true);
  }

  function validateForm(): string | null {
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return 'Quantity must be a whole number of at least 1.';
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return 'Price must be greater than or equal to 0.';
    if (Math.round(price * 100) !== price * 100) return 'Price must not have more than 2 decimal places.';
    if (form.displayName.trim().length < 2) return 'Display name must be at least 2 characters.';
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const invalid = validateForm();
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    const payload = {
      type: form.type,
      displayName: form.displayName.trim(),
      quantity: Number(form.quantity),
      price: Number(form.price),
      currency: form.currency,
      description: form.description,
      sortOrder: Number(form.sortOrder || 0),
      status: form.status,
    };
    try {
      if (editing) {
        await api(`/super-admin/engagement-bundles/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('Bundle updated.');
      } else {
        await api('/super-admin/engagement-bundles', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Bundle created.');
      }
      setOpen(false);
      bundles.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save the bundle.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(bundle: EngagementBundle) {
    const next = bundle.status === 'active' ? 'inactive' : 'active';
    try {
      await api(`/super-admin/engagement-bundles/${bundle.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(next === 'active' ? 'Bundle enabled.' : 'Bundle disabled.');
      bundles.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update the bundle.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/super-admin/engagement-bundles/${deleting.id}`, { method: 'DELETE' });
      toast.success('Bundle deleted.');
      setDeleting(null);
      bundles.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete the bundle.');
    } finally {
      setDeleteBusy(false);
    }
  }

  const typeLabel = (t: EngagementBundleType) => ENGAGEMENT_BUNDLE_TYPE_LABELS[t];

  return (
    <div>
      <PageHeader
        title="Engagement Pricing"
        subtitle="Predefined Likes, Views and Subscribers packages that customers can buy. Customers never set their own quantity or price."
        action={
          <Button icon={<Icons.Plus className="h-4 w-4" />} onClick={openCreate}>
            Create bundle
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-primary text-primary-foreground shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]'
                : 'bg-card text-muted-foreground ring-1 ring-border hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
            placeholder="Search bundles…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="sm:w-44">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <Button type="submit" icon={<Icons.Search className="h-4 w-4" />}>
          Search
        </Button>
      </form>

      {bundles.loading ? (
        <LoadingState label="Loading bundles…" />
      ) : bundles.error ? (
        <ErrorState message={bundles.error} onRetry={bundles.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No bundles yet"
            description="Create your first engagement package to start selling."
            action={<Button onClick={openCreate}>Create bundle</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden md:block">
            <Table>
              <THead>
                <Th>Bundle</Th>
                <Th>Type</Th>
                <Th>Quantity</Th>
                <Th>Price</Th>
                <Th>Status</Th>
                <Th>Sort order</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {items.map((bundle) => (
                  <Tr key={bundle.id}>
                    <Td>
                      <p className="font-medium">{bundle.displayName}</p>
                      {bundle.description ? (
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">{bundle.description}</p>
                      ) : null}
                    </Td>
                    <Td className="capitalize text-muted-foreground">{typeLabel(bundle.type)}</Td>
                    <Td className="tabular-nums">{bundle.quantity.toLocaleString()}</Td>
                    <Td className="tabular-nums">{formatMoney(bundle.price, bundle.currency)}</Td>
                    <Td>
                      <StatusBadge status={bundle.status} />
                    </Td>
                    <Td className="tabular-nums text-muted-foreground">{bundle.sortOrder}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {new Date(bundle.createdAt).toLocaleDateString()}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Icons.Edit className="h-4 w-4" />}
                          onClick={() => openEdit(bundle)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(bundle)}
                        >
                          {bundle.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Icons.Trash className="h-4 w-4" />}
                          onClick={() => setDeleting(bundle)}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y divide-border md:hidden dark:divide-border">
            {items.map((bundle) => (
              <li key={bundle.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {bundle.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel(bundle.type)} · {bundle.quantity.toLocaleString()} ·{' '}
                      {formatMoney(bundle.price, bundle.currency)}
                    </p>
                    {bundle.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{bundle.description}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={bundle.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" fullWidth={false} onClick={() => openEdit(bundle)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(bundle)}>
                    {bundle.status === 'active' ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Icons.Trash className="h-4 w-4" />}
                    onClick={() => setDeleting(bundle)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination
              page={bundles.data?.page ?? 1}
              totalPages={bundles.data?.totalPages ?? 1}
              onPage={setPage}
            />
          </div>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit bundle' : 'Create bundle'}
        size="lg"
      >
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="bundle-type">
              <Select
                id="bundle-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EngagementBundleType }))}
                required
              >
                {(Object.keys(ENGAGEMENT_BUNDLE_TYPE_LABELS) as EngagementBundleType[]).map((t) => (
                  <option key={t} value={t}>
                    {ENGAGEMENT_BUNDLE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="bundle-status">
              <Select
                id="bundle-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>
          <Field label="Display name" htmlFor="bundle-name" hint="Shown to customers, e.g. “1,000 Likes”.">
            <Input
              id="bundle-name"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Quantity" htmlFor="bundle-quantity">
              <Input
                id="bundle-quantity"
                type="number"
                step="1"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                required
              />
            </Field>
            <Field label="Price" htmlFor="bundle-price">
              <Input
                id="bundle-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
              />
            </Field>
            <Field label="Currency" htmlFor="bundle-currency">
              <Select
                id="bundle-currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as EngagementBundleCurrency }))}
              >
                {ENGAGEMENT_BUNDLE_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Description"
            htmlFor="bundle-description"
            hint="Optional. A short line customers see under the package name."
          >
            <Textarea
              id="bundle-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Field label="Sort order" htmlFor="bundle-sort" hint="Lower values appear first.">
            <Input
              id="bundle-sort"
              type="number"
              step="1"
              min="0"
              max="9999"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </Field>
          {error ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" fullWidth onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              {editing ? 'Save changes' : 'Create bundle'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete bundle?"
        message={
          deleting
            ? `“${deleting.displayName}” will be archived and hidden from customers. Existing orders keep their recorded quantity and price.`
            : ''
        }
        confirmLabel="Delete bundle"
        loading={deleteBusy}
      />
    </div>
  );
}