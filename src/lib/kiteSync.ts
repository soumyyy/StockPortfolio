import { fetchPortfolioForAccount, KiteAuthRequiredError } from './kite';
import { upsertSnapshot, updateSyncStatus } from './db';

export class SnapshotSyncError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'SnapshotSyncError';
  }
}

export async function syncAccountSnapshot(accountId: string) {
  try {
    const portfolio = await fetchPortfolioForAccount(accountId);
    await upsertSnapshot(accountId, {
      holdings: portfolio.holdings,
      positions: portfolio.positions,
    });
    await updateSyncStatus(accountId, {
      last_sync_at: new Date().toISOString(),
      last_error: null,
      last_error_at: null,
    });
    return portfolio;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync Kite snapshot';
    await updateSyncStatus(accountId, {
      last_error: message,
      last_error_at: new Date().toISOString(),
    });
    throw error;
  }
}

export async function trySyncAccount(accountId: string) {
  try {
    return await syncAccountSnapshot(accountId);
  } catch (error) {
    if (error instanceof KiteAuthRequiredError) {
      throw error;
    }
    throw new SnapshotSyncError(
      error instanceof Error ? error.message : 'Failed to sync portfolio',
      error instanceof Error ? error : undefined,
    );
  }
}
