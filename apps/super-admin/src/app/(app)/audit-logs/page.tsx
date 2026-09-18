'use client';

import { useState } from 'react';
import {
  Badge,
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
} from '@smm/ui';
import type { AuditLog, Paginated } from '@smm/types';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDateShort } from '@/lib/format';

const ROLES = ['super_admin', 'admin', 'user', 'system'];
const ACTIONS = [
  'admin.create',
  'admin.update_status',
  'admin.reset_password',
  'admin.delete',
  'license.create',
  'license.update_status',
  'license.renew',
  'user.update_status',
  'user.delete',
  'service.create',
  'service.update',
  'category.create',
  'category.update',
  'order.update_status',
  'payment_method.update',
  'setting.update',
];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actorRole, setActorRole] = useState('');
  const [action, setAction] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const logs = useApi<Paginated<AuditLog>>(
    `/super-admin/audit-logs?page=${page}&limit=15&search=${encodeURIComponent(search)}${
      actorRole ? `&actorRole=${actorRole}` : ''
    }${action ? `&action=${action}` : ''}`,
  );

  const items = logs.data?.items ?? [];

  return (
    <div>
      <PageHeader title="Audit logs" subtitle="Every privileged action, captured immutably." />

      <form
        className="mb-4 flex flex-col gap-2 lg:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput);
          setPage(1);
        }}
      >
        <div className="flex-1">
          <Input
            placeholder="Search actor, target or action…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="lg:w-44">
          <Select
            value={actorRole}
            onChange={(e) => {
              setActorRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actors</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <div className="lg:w-56">
          <Select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {ACTIONS.map((value) => (
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

      {logs.loading ? (
        <LoadingState label="Loading audit logs…" />
      ) : logs.error ? (
        <ErrorState message={logs.error} onRetry={logs.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="No audit events" description="Privileged actions will appear here." />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden lg:block">
            <Table>
              <THead>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Result</Th>
                <Th>IP</Th>
                <Th>When</Th>
              </THead>
              <TBody>
                {items.map((log) => (
                  <Tr key={log.id}>
                    <Td>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{log.actorName}</p>
                      <Badge>{log.actorRole.replace(/_/g, ' ')}</Badge>
                    </Td>
                    <Td className="font-mono text-xs">{log.action}</Td>
                    <Td>
                      <p className="text-sm text-zinc-700 dark:text-zinc-200">{log.targetLabel || '—'}</p>
                      <p className="text-xs text-zinc-400">{log.targetType}</p>
                    </Td>
                    <Td>
                      <StatusBadge status={log.result === 'success' ? 'completed' : 'failed'} />
                    </Td>
                    <Td className="font-mono text-xs text-zinc-500">{log.ip || '—'}</Td>
                    <Td className="whitespace-nowrap text-zinc-500">{formatDateShort(log.createdAt)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y divide-zinc-100 lg:hidden dark:divide-zinc-800">
            {items.map((log) => (
              <li key={log.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {log.actorName}
                    </p>
                    <p className="truncate font-mono text-xs text-zinc-500">{log.action}</p>
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      {log.targetLabel || log.targetType} · {formatDateShort(log.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={log.result === 'success' ? 'completed' : 'failed'} />
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination page={logs.data?.page ?? 1} totalPages={logs.data?.totalPages ?? 1} onPage={setPage} />
          </div>
        </Card>
      )}
    </div>
  );
}