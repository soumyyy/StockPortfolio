import type { NextApiRequest, NextApiResponse } from 'next';
import { kiteAccounts } from '../../config/kiteAccounts';
import { mergeHoldings, mergePositions } from '../../lib/kite';
import { applyMarketQuotes } from '../../lib/marketData';
import { getAllSnapshots, getSyncStatuses } from '../../lib/db';
import type { PortfolioAPIResponse } from '../../types/portfolio';
import type { Holding } from '../../types/holding';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PortfolioAPIResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [snapshots, syncStatuses] = await Promise.all([getAllSnapshots(), getSyncStatuses()]);
    const syncStatusMap = new Map(syncStatuses.map((status) => [status.account_id, status]));

    const accountPortfolios = [];
    for (const account of kiteAccounts) {
      const snapshot = snapshots.find((row) => row.account_id === account.id);
      const status = syncStatusMap.get(account.id);

      if (!snapshot) {
        accountPortfolios.push({
          accountId: account.id,
          accountLabel: account.label,
          holdings: [],
          positions: [],
          lastSyncedAt: null,
          needsSync: true,
          syncError: status?.last_error ?? null,
        });
        continue;
      }

      const holdings = (snapshot.holdings_json as Holding[]).map((holding) => ({
        ...holding,
        accountId: account.id,
        accountLabel: account.label,
      }));

      const enrichedHoldings = await applyMarketQuotes(holdings);

      accountPortfolios.push({
        accountId: account.id,
        accountLabel: account.label,
        holdings: enrichedHoldings,
        positions: snapshot.positions_json ?? [],
        lastSyncedAt: snapshot.fetched_at,
        needsSync: false,
        syncError: status?.last_error ?? null,
      });
    }

    const combinedHoldings = mergeHoldings(
      accountPortfolios.flatMap((account) => account.holdings),
    );
    const combinedPositions = mergePositions(
      accountPortfolios.flatMap((account) => account.positions),
    );
    const latestTimestamp =
      accountPortfolios
        .map((account) => (account.lastSyncedAt ? Date.parse(account.lastSyncedAt) : 0))
        .reduce((max, current) => Math.max(max, current), 0) || null;

    const response: PortfolioAPIResponse = {
      combined: {
        holdings: combinedHoldings,
        positions: combinedPositions,
        fetchedAt: latestTimestamp ? new Date(latestTimestamp).toISOString() : null,
      },
      accounts: accountPortfolios,
      errors: [],
    };

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json(response);
  } catch (error) {
    console.error('Failed to load portfolio snapshots', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load portfolio data',
    });
  }
}
