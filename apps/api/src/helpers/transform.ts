import { PlatformSetting, User, type LicenseRecord } from '@smm/database';
import { toLicense, toSafeUser } from '@smm/auth';
import type {
  AuditLog,
  License,
  Order as OrderEntity,
  PaymentMethod as PaymentMethodEntity,
  PlatformSettings,
  SafeUser,
  Transaction as TransactionEntity,
  Wallet as WalletEntity,
} from '@smm/types';

export type UserLike = {
  _id: { toString(): string };
  name: string;
  email: string;
  phone: string;
  role: SafeUser['role'];
  status: SafeUser['status'];
  licenseId?: { toString(): string } | null;
  subdomainSlug?: string | null;
  subdomain?: string | null;
  subdomainStatus?: SafeUser['subdomainStatus'];
  subdomainCreatedAt?: Date | null;
  adminId?: { toString(): string } | null;
  assignedTo?: { toString(): string } | null;
  parentAdminId?: { toString(): string } | null;
  adminScopes?: SafeUser['adminScopes'];
  createdAt: Date;
  updatedAt: Date;
};

export function serializeUser(user: UserLike): SafeUser {
  return toSafeUser(user as Parameters<typeof toSafeUser>[0]);
}

const DEFAULT_SETTINGS: PlatformSettings = {
  siteName: 'SMM Panel',
  youtubeLink: '',
  telegramLink: '',
  supportEmail: '',
  currency: 'USD',
  minDeposit: 10,
  registrationEnabled: true,
  updatedAt: '1970-01-01T00:00:00.000Z',
};

export async function buildPublicSettings(): Promise<PlatformSettings> {
  const docs = await PlatformSetting.find({}).lean();
  const out: PlatformSettings = { ...DEFAULT_SETTINGS };
  for (const doc of docs) {
    if (doc.key in out) {
      (out as unknown as Record<string, unknown>)[doc.key] = doc.value;
    }
    if (doc.key === 'updatedAt') {
      out.updatedAt = String(doc.value);
    }
  }
  const updated = docs
    .map((d) => d.updatedAt.getTime())
    .reduce((max, v) => Math.max(max, v), 0);
  out.updatedAt = new Date(updated).toISOString();
  return out;
}

export async function getSettingValue(key: string): Promise<unknown> {
  const doc = await PlatformSetting.findOne({ key }).lean();
  return doc?.value;
}

export async function serializeLicensesWithAdmins(licenses: LicenseRecord[]): Promise<License[]> {
  const adminIds = [...new Set(licenses.map((l) => String(l.adminUserId)))];
  const admins = await User.find({ _id: { $in: adminIds } }).lean();
  const byId = new Map(admins.map((a) => [String(a._id), a]));
  return licenses.map((l) => {
    const admin = byId.get(String(l.adminUserId));
    return toLicense(l, admin?.name, admin?.email, {
      subdomainSlug: admin?.subdomainSlug,
      subdomain: admin?.subdomain,
      subdomainStatus: admin?.subdomainStatus,
    });
  });
}

export type OrderLike = {
  _id: { toString(): string };
  userId: { toString(): string };
  serviceId: { toString(): string };
  serviceName: string;
  categoryName: string;
  link: string;
  quantity: number;
  price: number;
  status: OrderEntity['status'];
  startCounter: number;
  remaining: number;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeOrder(o: OrderLike): OrderEntity {
  return {
    id: String(o._id),
    userId: String(o.userId),
    serviceId: String(o.serviceId),
    serviceName: o.serviceName,
    categoryName: o.categoryName,
    link: o.link,
    quantity: o.quantity,
    price: o.price,
    status: o.status,
    startCounter: o.startCounter,
    remaining: o.remaining,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export type WalletLike = {
  _id: { toString(): string };
  userId: { toString(): string };
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  currency: string;
  updatedAt: Date;
};

export function serializeWallet(w: WalletLike): WalletEntity {
  return {
    id: String(w._id),
    userId: String(w.userId),
    balance: w.balance,
    totalDeposited: w.totalDeposited,
    totalSpent: w.totalSpent,
    currency: w.currency,
    updatedAt: w.updatedAt.toISOString(),
  };
}

export type TxLike = {
  _id: { toString(): string };
  userId: { toString(): string };
  type: TransactionEntity['type'];
  status: TransactionEntity['status'];
  amount: number;
  balanceAfter: number;
  reference: string;
  description: string;
  createdAt: Date;
};

export function serializeTransaction(t: TxLike): TransactionEntity {
  return {
    id: String(t._id),
    userId: String(t.userId),
    type: t.type,
    status: t.status,
    amount: t.amount,
    balanceAfter: t.balanceAfter,
    reference: t.reference,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
  };
}

export type AuditLike = {
  _id: { toString(): string };
  actorId: { toString(): string } | null;
  actorName: string;
  actorRole: AuditLog['actorRole'];
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  result: 'success' | 'failure';
  ip: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export function serializeAuditLog(l: AuditLike): AuditLog {
  return {
    id: String(l._id),
    actorId: l.actorId ? String(l.actorId) : null,
    actorName: l.actorName,
    actorRole: l.actorRole,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    targetLabel: l.targetLabel,
    result: l.result,
    ip: l.ip,
    metadata: l.metadata,
    createdAt: l.createdAt.toISOString(),
  };
}

export type PmLike = {
  _id: { toString(): string };
  name: string;
  code: string;
  enabled: boolean;
  instructions: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export function serializePaymentMethod(m: PmLike): PaymentMethodEntity {
  return {
    id: String(m._id),
    name: m.name,
    code: m.code,
    enabled: m.enabled,
    instructions: m.instructions,
    config: m.config,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}