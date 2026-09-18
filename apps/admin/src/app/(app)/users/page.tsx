'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
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
import type { Paginated, SafeUser, Wallet } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDateShort, formatMoney } from '@/lib/format';

type UserRow = SafeUser & { wallet: Wallet | null };

const STATUSES = ['active', 'suspended', 'inactive'];

interface CreateUserForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_CREATE: CreateUserForm = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function UsersPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showClaim, setShowClaim] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const query = `/admin/users?page=${page}&limit=10&search=${encodeURIComponent(search)}${
    status ? `&status=${status}` : ''
  }`;
  const users = useApi<Paginated<UserRow>>(query);

  async function changeStatus(user: UserRow, next: string) {
    setUpdating(user.id);
    try {
      await api(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(`User marked ${next}.`);
      users.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update user.');
    } finally {
      setUpdating(null);
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await api('/admin/users', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      toast.success('User created.');
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      setPage(1);
      users.reload();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Unable to create user.');
    } finally {
      setCreating(false);
    }
  }

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClaimError(null);
    setClaiming(true);
    try {
      await api('/admin/users/claim', {
        method: 'POST',
        body: JSON.stringify({ email: claimEmail }),
      });
      toast.success('User claimed into your panel.');
      setShowClaim(false);
      setClaimEmail('');
      setPage(1);
      users.reload();
    } catch (err) {
      setClaimError(err instanceof ApiError ? err.message : 'Unable to claim user.');
    } finally {
      setClaiming(false);
    }
  }

  const items = users.data?.items ?? [];

  return (
    <div>
      <PageHeader title="Users" subtitle="Users in your panel. Assign an existing account to this panel or create one." />

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
            placeholder="Search by name, email or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="sm:w-44">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" icon={<Icons.Search className="h-4 w-4" />}>
          Search
        </Button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button icon={<Icons.Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          Create user
        </Button>
        <Button variant="outline" icon={<Icons.Links className="h-4 w-4" />} onClick={() => setShowClaim(true)}>
          Claim existing
        </Button>
      </div>

      {users.loading ? (
        <LoadingState label="Loading users…" />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="No users found" description="Create a user or claim an existing account to get started." />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden sm:block">
            <Table>
              <THead>
                <Th>User</Th>
                <Th>Phone</Th>
                <Th>Balance</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {items.map((user) => (
                  <Tr key={user.id}>
                    <Td>
                      <Link
                        href={`/users/${user.id}`}
                        className="font-semibold text-zinc-800 hover:text-indigo-600 dark:text-zinc-100"
                      >
                        {user.name}
                      </Link>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </Td>
                    <Td className="text-zinc-500">{user.phone}</Td>
                    <Td className="tabular-nums">{user.wallet ? formatMoney(user.wallet.balance) : '—'}</Td>
                    <Td>
                      <StatusBadge status={user.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-zinc-500">{formatDateShort(user.createdAt)}</Td>
                    <Td>
                      <div className="w-36">
                        <Select
                          value={user.status}
                          disabled={updating === user.id}
                          onChange={(e) => changeStatus(user, e.target.value)}
                          className="py-1.5 text-xs"
                        >
                          {STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {value}
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
          <ul className="divide-y divide-zinc-100 sm:hidden dark:divide-zinc-800">
            {items.map((user) => (
              <li key={user.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/users/${user.id}`}
                      className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100"
                    >
                      {user.name}
                    </Link>
                    <p className="truncate text-xs text-zinc-500">{user.email}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {user.wallet ? formatMoney(user.wallet.balance) : '—'}
                    </p>
                  </div>
                  <StatusBadge status={user.status} />
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination page={users.data?.page ?? 1} totalPages={users.data?.totalPages ?? 1} onPage={setPage} />
          </div>
        </Card>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create user"
        description="A login is created for them within your panel."
      >
        <form onSubmit={submitCreate} className="space-y-4">
          <Field label="Full name" htmlFor="new-user-name">
            <Input
              id="new-user-name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label="Email" htmlFor="new-user-email">
            <Input
              id="new-user-email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </Field>
          <Field label="Phone" htmlFor="new-user-phone">
            <Input
              id="new-user-phone"
              value={createForm.phone}
              onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" htmlFor="new-user-password">
              <Input
                id="new-user-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </Field>
            <Field label="Confirm password" htmlFor="new-user-confirm">
              <Input
                id="new-user-confirm"
                type="password"
                value={createForm.confirmPassword}
                onChange={(e) => setCreateForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                required
              />
            </Field>
          </div>
          {createError ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{createError}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create user
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showClaim}
        onClose={() => setShowClaim(false)}
        title="Claim existing user"
        description="Assign a self-registered platform account to your panel."
      >
        <form onSubmit={submitClaim} className="space-y-4">
          <Field label="Account email" htmlFor="claim-email">
            <Input
              id="claim-email"
              type="email"
              placeholder="user@example.com"
              value={claimEmail}
              onChange={(e) => setClaimEmail(e.target.value)}
              required
            />
          </Field>
          {claimError ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{claimError}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowClaim(false)} disabled={claiming}>
              Cancel
            </Button>
            <Button type="submit" loading={claiming}>
              Claim user
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}