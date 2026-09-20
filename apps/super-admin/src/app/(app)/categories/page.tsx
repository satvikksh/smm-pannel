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
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';

interface CategoryDoc {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  status: 'active' | 'inactive';
  sortOrder: number;
}

interface PaginatedCategories {
  items: CategoryDoc[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FormState {
  name: string;
  icon: string;
  sortOrder: string;
  status: 'active' | 'inactive';
}

const EMPTY: FormState = { name: '', icon: 'grid', sortOrder: '0', status: 'active' };

export default function CategoriesPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const categories = useApi<PaginatedCategories>(`/super-admin/categories?page=${page}&limit=10`);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDoc | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(category: CategoryDoc) {
    setEditing(category);
    setForm({
      name: category.name,
      icon: category.icon,
      sortOrder: String(category.sortOrder),
      status: category.status,
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
      icon: form.icon,
      sortOrder: Number(form.sortOrder),
      status: form.status,
    };
    try {
      if (editing) {
        await api(`/super-admin/categories/${editing._id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('Category updated.');
      } else {
        await api('/super-admin/categories', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Category created.');
      }
      setOpen(false);
      categories.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save the category.');
    } finally {
      setSaving(false);
    }
  }

  const items = categories.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Group your services into categories."
        action={
          <Button icon={<Icons.Plus className="h-4 w-4" />} onClick={openCreate}>
            New category
          </Button>
        }
      />

      {categories.loading ? (
        <LoadingState label="Loading categories…" />
      ) : categories.error ? (
        <ErrorState message={categories.error} onRetry={categories.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No categories yet"
            description="Create a category before adding services."
            action={<Button onClick={openCreate}>New category</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden sm:block">
            <Table>
              <THead>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Icon</Th>
                <Th>Orders</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {items.map((category) => (
                  <Tr key={category._id}>
                    <Td className="font-medium">{category.name}</Td>
                    <Td className="font-mono text-xs text-zinc-500">{category.slug}</Td>
                    <Td className="text-zinc-500">{category.icon}</Td>
                    <Td className="tabular-nums">{category.sortOrder}</Td>
                    <Td>
                      <StatusBadge status={category.status} />
                    </Td>
                    <Td>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Icons.Edit className="h-4 w-4" />}
                        onClick={() => openEdit(category)}
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
            {items.map((category) => (
              <li key={category._id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{category.name}</p>
                  <p className="text-xs text-zinc-500">
                    {category.slug} · order {category.sortOrder}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={category.status} />
                  <Button variant="outline" size="sm" onClick={() => openEdit(category)}>
                    Edit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination
              page={categories.data?.page ?? 1}
              totalPages={categories.data?.totalPages ?? 1}
              onPage={setPage}
            />
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit category' : 'New category'}>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Name" htmlFor="category-name">
            <Input
              id="category-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon" htmlFor="category-icon" hint="Lucide icon name.">
              <Input
                id="category-icon"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              />
            </Field>
            <Field label="Sort order" htmlFor="category-order">
              <Input
                id="category-order"
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Status" htmlFor="category-status">
            <Select
              id="category-status"
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
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}