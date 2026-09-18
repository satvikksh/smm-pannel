'use client';

import { useState, type FormEvent } from 'react';
import {
  Badge,
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
  Textarea,
  useToast,
} from '@smm/ui';
import type { PaymentMethod } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDateShort } from '@/lib/format';

interface FormState {
  name: string;
  code: string;
  instructions: string;
  enabled: boolean;
  config: string;
}

const EMPTY: FormState = {
  name: '',
  code: '',
  instructions: '',
  enabled: true,
  config: '{}',
};

export default function PaymentsPage() {
  const toast = useToast();
  const methods = useApi<PaymentMethod[]>('/super-admin/payments');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(method: PaymentMethod) {
    setEditing(method);
    setForm({
      name: method.name,
      code: method.code,
      instructions: method.instructions,
      enabled: method.enabled,
      config: JSON.stringify(method.config ?? {}, null, 2),
    });
    setError(null);
    setOpen(true);
  }

  function parseConfig(): Record<string, unknown> {
    try {
      const parsed = JSON.parse(form.config || '{}');
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      throw new ApiError(400, 'invalid_config', 'Config must be valid JSON.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        instructions: form.instructions,
        enabled: form.enabled,
        config: parseConfig(),
      };
      if (editing) {
        await api(`/super-admin/payments/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('Payment method updated.');
      } else {
        await api('/super-admin/payments', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Payment method created.');
      }
      setOpen(false);
      methods.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save the payment method.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(method: PaymentMethod) {
    setBusy(method.id);
    try {
      await api(`/super-admin/payments/${method.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !method.enabled }),
      });
      toast.success(method.enabled ? 'Payment method disabled.' : 'Payment method enabled.');
      methods.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update payment method.');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(deleteTarget.id);
    try {
      await api(`/super-admin/payments/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Payment method deleted.');
      setDeleteTarget(null);
      methods.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete payment method.');
    } finally {
      setBusy(null);
    }
  }

  const items = methods.data ?? [];

  return (
    <div>
      <PageHeader
        title="Payment methods"
        subtitle="Control which deposit channels customers can use."
        action={
          <Button icon={<Icons.Plus className="h-4 w-4" />} onClick={openCreate}>
            New method
          </Button>
        }
      />

      {methods.loading ? (
        <LoadingState label="Loading payment methods…" />
      ) : methods.error ? (
        <ErrorState message={methods.error} onRetry={methods.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No payment methods"
            description="Add a channel so customers can fund their wallets."
            action={<Button onClick={openCreate}>New method</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((method) => (
            <Card key={method.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {method.name}
                    </h3>
                    <Badge>{method.code}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">Added {formatDateShort(method.createdAt)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    method.enabled
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {method.enabled ? 'enabled' : 'disabled'}
                </span>
              </div>

              {method.instructions ? (
                <p className="mt-3 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">
                  {method.instructions}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={method.enabled ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                  loading={busy === method.id}
                  onClick={() => toggle(method)}
                >
                  {method.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Icons.Edit className="h-4 w-4" />}
                  onClick={() => openEdit(method)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Icons.Trash className="h-4 w-4" />}
                  onClick={() => setDeleteTarget(method)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit payment method' : 'New payment method'}
        size="lg"
      >
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="payment-name">
              <Input
                id="payment-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Code" htmlFor="payment-code" hint="Lowercase letters, numbers, dashes, underscores.">
              <Input
                id="payment-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                required
              />
            </Field>
          </div>
          <Field label="Instructions" htmlFor="payment-instructions">
            <Textarea
              id="payment-instructions"
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              placeholder="Tell customers how to complete the deposit."
            />
          </Field>
          <Field label="Config (JSON)" htmlFor="payment-config">
            <Textarea
              id="payment-config"
              value={form.config}
              onChange={(e) => setForm((f) => ({ ...f, config: e.target.value }))}
              className="font-mono text-xs"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            Enabled for deposits
          </label>
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
              {editing ? 'Save changes' : 'Create method'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="Delete payment method?"
        message={`${deleteTarget?.name ?? 'This method'} will no longer be available for deposits.`}
        confirmLabel="Delete"
        loading={Boolean(deleteTarget && busy === deleteTarget.id)}
      />
    </div>
  );
}