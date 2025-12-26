import { Pool } from 'pg';
import invariant from '../utils/invariant';

const connectionString = process.env.DATABASE_URL;
invariant(connectionString, 'DATABASE_URL must be set to use Supabase/Postgres.');

const pool = new Pool({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
});

export interface SnapshotRecord {
  id: string;
  account_id: string;
  holdings_json: any;
  positions_json: any;
  fetched_at: string;
}

export interface SyncStatusRecord {
  account_id: string;
  last_sync_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
}

export async function getSnapshotByAccount(accountId: string) {
  const result = await pool.query<SnapshotRecord>(
    `select * from portfolio_snapshots where account_id = $1 order by fetched_at desc limit 1`,
    [accountId],
  );
  return result.rows[0] ?? null;
}

export async function upsertSnapshot(accountId: string, data: { holdings: any; positions: any }) {
  await pool.query(
    `
    insert into portfolio_snapshots (account_id, holdings_json, positions_json, fetched_at)
    values ($1, $2::jsonb, $3::jsonb, now())
    on conflict (account_id)
    do update set
      holdings_json = excluded.holdings_json,
      positions_json = excluded.positions_json,
      fetched_at = excluded.fetched_at
  `,
    [accountId, JSON.stringify(data.holdings), JSON.stringify(data.positions)],
  );
}

export async function getAllSnapshots() {
  const result = await pool.query<SnapshotRecord>(
    'select * from portfolio_snapshots order by fetched_at desc',
  );
  return result.rows;
}

export async function updateSyncStatus(
  accountId: string,
  payload: Partial<Omit<SyncStatusRecord, 'account_id'>>,
) {
  await pool.query(
    `
    insert into sync_status (account_id, last_sync_at, last_error, last_error_at)
    values ($1, $2, $3, $4)
    on conflict (account_id)
    do update set
      last_sync_at = coalesce(excluded.last_sync_at, sync_status.last_sync_at),
      last_error = excluded.last_error,
      last_error_at = excluded.last_error_at
  `,
    [accountId, payload.last_sync_at, payload.last_error, payload.last_error_at],
  );
}

export async function getSyncStatuses() {
  const result = await pool.query<SyncStatusRecord>('select * from sync_status');
  return result.rows;
}
