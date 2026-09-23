import { mongoose } from '@smm/database';

let suppressionsChecked: Promise<boolean> | null = null;

/**
 * MongoDB transactions require a replica set / mongos. Local dev often runs a
 * standalone replica-less mongod, where startTransaction throws code 20.
 * We detect support once and degrade to sequential writes on standalone.
 */
export function serverSupportsTransactions(): Promise<boolean> {
  if (!suppressionsChecked) {
    suppressionsChecked = (async () => {
      try {
        const db = mongoose.connection.db;
        if (!db) return false;
        const hello = (await db.admin().command({ hello: 1 })) as { setName?: string };
        return Boolean(hello.setName);
      } catch {
        return false;
      }
    })().catch(() => false);
  }
  return suppressionsChecked;
}

export type RunnerSession = mongoose.ClientSession | null;

/** Options bag to attach to mongoose operations when a session exists. */
export function withSession(session: RunnerSession): { session: mongoose.ClientSession } | undefined {
  return session ? { session } : undefined;
}

/**
 * Run fn inside a transaction when the deployment supports it; otherwise run
 * it sequentially (local standalone dev). fn receives the session (or null).
 *
 * Uses `session.withTransaction()` rather than a manual start/commit sequence:
 * withTransaction retries the callback on TransientTransactionError and retries
 * the commit on UnknownTransactionCommitResult. A manual sequence let an
 * aborted transaction surface as `NoSuchTransaction` (code 251) and bubble up
 * as an unhandled 500 instead of being retried.
 */
export async function runInTransaction<T>(fn: (session: RunnerSession) => Promise<T>): Promise<T> {
  const supported = await serverSupportsTransactions();
  if (!supported) {
    return fn(null);
  }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction<T>(() => fn(session));
  } finally {
    await session.endSession().catch(() => undefined);
  }
}