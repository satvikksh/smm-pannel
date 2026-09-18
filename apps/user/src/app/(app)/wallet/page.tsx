'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Icons,
  Input,
  LoadingState,
  Modal,
  Pagination,
  Select,
  StatCard,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@smm/ui';
import type { Paginated, PaymentMethod, PlatformSettings, Transaction, Wallet as WalletType } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDate, formatMoney } from '@/lib/format';

export default function WalletPage() {
  const toast = useToast();
  const wallet = useApi<WalletType>('/user/wallet');
  const [page, setPage] = useState(1);
  const txns = useApi<Paginated<Transaction>>(`/user/wallet/transactions?page=${page}&limit=10`);
  const settings = useApi<{ settings: PlatformSettings; paymentMethods: PaymentMethod[] }>('/user/settings');

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const methods = settings.data?.paymentMethods ?? [];
  const minDeposit = settings.data?.settings.minDeposit ?? 0;
  const currency = wallet.data?.currency ?? settings.data?.settings.currency ?? 'USD';

  useEffect(() => {
    if (open && !methodId && methods.length > 0) setMethodId(methods[0]!.id);
    if (open) setAmount(String(minDeposit || 10));
  }, [open, methodId, methods, minDeposit]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (value < minDeposit) {
      setError(`Minimum deposit is ${formatMoney(minDeposit, currency)}.`);
      return;
    }
    setSubmitting(true);
    try {
      await api('/user/wallet/add-funds', {
        method: 'POST',
        body: JSON.stringify({ amount: value, paymentMethodId: methodId || undefined }),
      });
      toast.success('Funds added to your wallet.');
      setOpen(false);
      wallet.reload();
      txns.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to add funds.');
    } finally {
      setSubmitting(false);
    }
  }

  const items = txns.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Wallet"
        subtitle="Top up your balance and review all transactions."
        action={
          <Button icon={<Icons.Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Add funds
          </Button>
        }
      />

      {wallet.error ? (
        <ErrorState message={wallet.error} onRetry={wallet.reload} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            label="Current balance"
            value={wallet.data ? formatMoney(wallet.data.balance, currency) : '—'}
            icon={<Icons.Wallet className="h-5 w-5" />}
          />
          <StatCard
            label="Total deposited"
            value={wallet.data ? formatMoney(wallet.data.totalDeposited, currency) : '—'}
            icon={<Icons.Bank className="h-5 w-5" />}
          />
          <StatCard
            label="Total spent"
            value={wallet.data ? formatMoney(wallet.data.totalSpent, currency) : '—'}
            icon={<Icons.Orders className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="mt-6">
        <Card className="overflow-hidden p-0">
          <div className="p-5 pb-0">
            <CardHeader title="Transactions" subtitle="Credits and debits on your wallet" />
          </div>
          {txns.loading ? (
            <div className="p-5">
              <LoadingState label="Loading transactions…" />
            </div>
          ) : txns.error ? (
            <div className="p-5">
              <ErrorState message={txns.error} onRetry={txns.reload} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No transactions yet" description="Your wallet activity will appear here." />
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <THead>
                    <Th>Reference</Th>
                    <Th>Description</Th>
                    <Th>Amount</Th>
                    <Th>Balance</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                  </THead>
                  <TBody>
                    {items.map((txn) => (
                      <Tr key={txn.id}>
                        <Td className="font-mono text-xs">{txn.reference}</Td>
                        <Td>{txn.description}</Td>
                        <Td
                          className={`tabular-nums font-semibold ${
                            txn.type === 'debit' ? 'text-danger' : 'text-success'
                          }`}
                        >
                          {txn.type === 'debit' ? '-' : '+'}
                          {formatMoney(txn.amount, currency)}
                        </Td>
                        <Td className="tabular-nums">{formatMoney(txn.balanceAfter, currency)}</Td>
                        <Td>
                          <StatusBadge status={txn.status} />
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">{formatDate(txn.createdAt)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
              <ul className="divide-y divide-border px-5 sm:hidden">
                {items.map((txn) => (
                  <li key={txn.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {txn.description}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(txn.createdAt)}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        txn.type === 'debit' ? 'text-danger' : 'text-success'
                      }`}
                    >
                      {txn.type === 'debit' ? '-' : '+'}
                      {formatMoney(txn.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-5 pb-4">
                <Pagination
                  page={txns.data?.page ?? 1}
                  totalPages={txns.data?.totalPages ?? 1}
                  onPage={setPage}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add funds"
        description={`Minimum deposit ${formatMoney(minDeposit, currency)}.`}
      >
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Amount" htmlFor="deposit-amount">
            <Input
              id="deposit-amount"
              type="number"
              min={minDeposit}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="Payment method" htmlFor="deposit-method">
            <Select id="deposit-method" value={methodId} onChange={(e) => setMethodId(e.target.value)}>
              {methods.length === 0 ? <option value="">No methods available</option> : null}
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </Select>
          </Field>
          {methodId && methods.find((m) => m.id === methodId)?.instructions ? (
            <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              {methods.find((m) => m.id === methodId)?.instructions}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
          ) : null}
          <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">New balance</span>
            <Badge>
              {formatMoney((wallet.data?.balance ?? 0) + Number(amount || 0), currency)}
            </Badge>
          </div>
          <Button type="submit" fullWidth loading={submitting} disabled={methods.length === 0}>
            Add funds
          </Button>
        </form>
      </Modal>
    </div>
  );
}
