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
  Textarea,
  Th,
  THead,
  Tr,
  useToast,
} from '@smm/ui';
import type { Paginated, Service } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatMoney } from '@/lib/format';

interface CategoryDoc {
  _id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface FormState {
  name: string;
  categoryId: string;
  description: string;
  price: string;
  minOrder: string;
  maxOrder: string;
  status: 'active' | 'inactive';
}

const EMPTY: FormState = {
  name: '',
  categoryId: '',
  description: '',
  price: '',
  minOrder: '1',
  maxOrder: '1000',
  status: 'active',
};

export default function ServicesPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const services = useApi<Paginated<Service>>(
    `/super-admin/services?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
  );
  const categories = useApi<CategoryDoc[]>('/super-admin/categories/all');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categoryList = categories.data ?? [];

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, categoryId: categoryList[0]?._id ?? '' });
    setError(null);
    setOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      categoryId: service.categoryId,
      description: service.description,
      price: String(service.price),
      minOrder: String(service.minOrder),
      maxOrder: String(service.maxOrder),
      status: service.status,
    });
    setError(null);
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      description: form.description,
      price: Number(form.price),
      minOrder: Number(form.minOrder),
      maxOrder: Number(form.maxOrder),
      status: form.status,
    };
    try {
      if (editing) {
        await api(`/super-admin/services/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('Service updated.');
      } else {
        await api('/super-admin/services', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Service created.');
      }
      setOpen(false);
      services.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save the service.');
    } finally {
      setSaving(false);
    }
  }

  const items = services.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Create and maintain the services offered to customers."
        action={
          <Button icon={<Icons.Plus className="h-4 w-4" />} onClick={openCreate}>
            New service
          </Button>
        }
      />

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput);
          setPage(1);
        }}
      >
        <div className="flex-1">
          <Input
            placeholder="Search services…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" icon={<Icons.Search className="h-4 w-4" />}>
          Search
        </Button>
      </form>

      {services.loading ? (
        <LoadingState label="Loading services…" />
      ) : services.error ? (
        <ErrorState message={services.error} onRetry={services.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No services yet"
            description="Create your first service to get started."
            action={<Button onClick={openCreate}>New service</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden sm:block">
            <Table>
              <THead>
                <Th>Service</Th>
                <Th>Category</Th>
                <Th>Unit price</Th>
                <Th>Min / Max</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {items.map((service) => (
                  <Tr key={service.id}>
                    <Td className="font-medium">{service.name}</Td>
                    <Td className="text-zinc-500">{service.categoryName || '—'}</Td>
                    <Td className="tabular-nums">{formatMoney(service.price)}</Td>
                    <Td className="tabular-nums text-zinc-500">
                      {service.minOrder} / {service.maxOrder}
                    </Td>
                    <Td>
                      <StatusBadge status={service.status} />
                    </Td>
                    <Td>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Icons.Edit className="h-4 w-4" />}
                        onClick={() => openEdit(service)}
                      >
                        Edit
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y divide-zinc-100 sm:hidden dark:divide-zinc-800">
            {items.map((service) => (
              <li key={service.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {service.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {service.categoryName || '—'} · {formatMoney(service.price)} · {service.minOrder}/{service.maxOrder}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEdit(service)}>
                  Edit
                </Button>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination
              page={services.data?.page ?? 1}
              totalPages={services.data?.totalPages ?? 1}
              onPage={setPage}
            />
          </div>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit service' : 'New service'}
        size="lg"
      >
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Name" htmlFor="service-name">
            <Input
              id="service-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label="Category" htmlFor="service-category">
            <Select
              id="service-category"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              required
            >
              <option value="">Select a category</option>
              {categoryList.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="service-description">
            <Textarea
              id="service-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit price" htmlFor="service-price">
              <Input
                id="service-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
              />
            </Field>
            <Field label="Min order" htmlFor="service-min">
              <Input
                id="service-min"
                type="number"
                min="1"
                value={form.minOrder}
                onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
                required
              />
            </Field>
            <Field label="Max order" htmlFor="service-max">
              <Input
                id="service-max"
                type="number"
                min="1"
                value={form.maxOrder}
                onChange={(e) => setForm((f) => ({ ...f, maxOrder: e.target.value }))}
                required
              />
            </Field>
          </div>
          <Field label="Status" htmlFor="service-status">
            <Select
              id="service-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState['status'] }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              {editing ? 'Save changes' : 'Create service'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}