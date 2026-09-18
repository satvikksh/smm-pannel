'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icons,
  Input,
  LoadingState,
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

type UserRow = SafeUser & { wallet: Wallet | null; ordersCount: number; totalSpent: number };

const STATUSES = ['active', 'suspended', 'inactive'];

export default function UsersPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const users = useApi<Paginated<UserRow>>(
    `/super-admin/users?page=${page}&limit=10&search=${encodeURIComponent(search)}${
      status ? `&status=${status}` : ''
    }`,
  );

  async function changeStatus(user: UserRow, next: string) {
    setUpdating(user.id);
    try {
      await api(`/super-admin/users/${user.id}/status`, {
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

  const items = users.data?.items ?? [];

  return (
    <div>
      <PageHeader title="Users" subtitle="Every customer account on the platform." />

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

      {users.loading ? (
        <LoadingState label="Loading users…" />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="No users found" description="Try adjusting your search or filters." />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden lg:block">
            <Table>
              <THead>
                <Th>User</Th>
                <Th>Phone</Th>
                <Th>Balance</Th>
                <Th>Orders</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th>Update</Th>
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
                    <Td className="tabular-nums">{user.ordersCount}</Td>
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
          <ul className="divide-y divide-zinc-100 lg:hidden dark:divide-zinc-800">
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
                      {user.wallet ? formatMoney(user.wallet.balance) : '—'} · {user.ordersCount} orders
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
    </div>
  );
}