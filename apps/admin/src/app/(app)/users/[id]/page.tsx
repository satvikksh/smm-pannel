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
  StatCard,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@smm/ui';
import type { SafeUser, Transaction, Wallet } from '@smm/types';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDate, formatMoney } from '@/lib/format';

interface UserDetail {
  user: SafeUser;
  wallet: Wallet | null;
  ordersCount: number;
  transactions: Transaction[];
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  const detail = useApi<UserDetail>(`/admin/users/${id}`);

  if (detail.loading) return <LoadingState label="Loading user…" />;
  if (detail.error || !detail.data) {
    return <ErrorState message={detail.error ?? 'User not found.'} onRetry={detail.reload} />;
  }

  const { user, wallet, ordersCount, transactions } = detail.data;

  return (
    <div>
      <PageHeader
        title={user.name}
        subtitle={user.email}
        action={
          <Link href="/users">
            <Button variant="outline" size="sm" icon={<Icons.ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Balance"
          value={wallet ? formatMoney(wallet.balance, wallet.currency) : '—'}
          icon={<Icons.Wallet className="h-5 w-5" />}
        />
        <StatCard label="Orders" value={ordersCount} icon={<Icons.Orders className="h-5 w-5" />} />
        <StatCard
          label="Deposited"
          value={wallet ? formatMoney(wallet.totalDeposited, wallet.currency) : '—'}
          icon={<Icons.Bank className="h-5 w-5" />}
        />
        <StatCard
          label="Spent"
          value={wallet ? formatMoney(wallet.totalSpent, wallet.currency) : '—'}
          icon={<Icons.Analytics className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Account" />
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={user.status} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium capitalize text-foreground">{user.role}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium text-foreground">{user.phone}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Joined</dt>
              <dd className="font-medium text-foreground">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="overflow-hidden p-0 lg:col-span-2">
          <div className="p-5 pb-0">
            <CardHeader title="Recent transactions" subtitle="Latest 20 wallet movements" />
          </div>
          {transactions.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <THead>
                <Th>Reference</Th>
                <Th>Description</Th>
                <Th>Amount</Th>
                <Th>Date</Th>
              </THead>
              <TBody>
                {transactions.map((txn) => (
                  <Tr key={txn.id}>
                    <Td className="font-mono text-xs">{txn.reference}</Td>
                    <Td>{txn.description}</Td>
                    <Td
                      className={`tabular-nums font-semibold ${
                        txn.type === 'debit' ? 'text-danger' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {txn.type === 'debit' ? '-' : '+'}
                      {formatMoney(txn.amount)}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDate(txn.createdAt)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}