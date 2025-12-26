import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Holding } from '../types/holding';
import type { PortfolioAPIResponse } from '../types/portfolio';
import HoldingCard from '../components/HoldingCard';
import PortfolioSummary from '../components/PortfolioSummary';

const LoadingState = () => (
  <div className="min-h-screen bg-[#0A0A0A] text-white/80 p-6 space-y-4">
    <div className="h-16 bg-white/[0.03] rounded-lg animate-pulse" />
    <div className="h-32 bg-white/[0.03] rounded-lg animate-pulse" />
    <div className="space-y-3">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="h-20 bg-white/[0.03] rounded-lg animate-pulse" />
      ))}
    </div>
  </div>
);

export default function HoldingsPage() {
  const [portfolio, setPortfolio] = useState<PortfolioAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'unrealized' | 'daily' | 'invested'>('alphabetical');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/portfolio', {
        headers: { 'Cache-Control': 'no-store' },
      });

      if (!response.ok) {
        throw new Error('Unable to load holdings. Please try again.');
      }

      const data = (await response.json()) as PortfolioAPIResponse;
      setPortfolio(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load holdings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const combinedHoldings = useMemo(() => {
    const holdings = portfolio?.combined.holdings ?? [];
    const sorted = [...holdings];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortOption) {
        case 'alphabetical':
          comparison = a.ticker.localeCompare(b.ticker);
          break;
        case 'unrealized':
          comparison = a.unrealizedPL - b.unrealizedPL;
          break;
        case 'daily':
          comparison = a.dailyChangePercentage - b.dailyChangePercentage;
          break;
        case 'invested':
          comparison = a.averageBuyPrice * a.quantity - b.averageBuyPrice * b.quantity;
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [portfolio, sortDirection, sortOption]);
  const accounts = portfolio?.accounts ?? [];

  const latestCombinedTimestamp = useMemo(() => {
    const timestamp = portfolio?.combined.fetchedAt;
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleString('en-IN', {
        hour12: true,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      return timestamp;
    }
  }, [portfolio]);

  const formatTimestamp = (value?: string | null) => {
    if (!value) return 'Never synced';
    try {
      return new Date(value).toLocaleString('en-IN', {
        hour12: true,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      return value;
    }
  };

  const handleReconnect = (accountId: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/api/kite/login?account=${accountId}`;
    }
  };

  const handleSortChange = (option: 'alphabetical' | 'unrealized' | 'daily' | 'invested') => {
    if (sortOption === option) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortOption(option);
      setSortDirection('desc');
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    try {
      setSyncingAccountId(accountId);
      setError(null);
      const response = await fetch(`/api/kite/sync?account=${encodeURIComponent(accountId)}`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload?.reauthRequired) {
          handleReconnect(accountId);
          return;
        }
        throw new Error(payload?.message || 'Failed to sync holdings');
      }

      await fetchPortfolio();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync holdings';
      setError(message);
    } finally {
      setSyncingAccountId(null);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-white">Holdings</h1>
          <p className="text-sm text-white/60">
            Last combined refresh: {latestCombinedTimestamp ?? 'Never synced'}
          </p>
        </div>

        {error && (
          <div className="backdrop-blur bg-red-500/10 border border-red-500/40 text-red-100 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {accounts.length > 0 && (
          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-4">
            {accounts.map((account) => (
              <div
                key={account.accountId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.04] pb-4 last:border-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-semibold text-white/90">{account.accountLabel}</div>
                  <div className="text-xs text-white/50">
                    Last synced: {formatTimestamp(account.lastSyncedAt)}
                  </div>
                  {account.needsSync && (
                    <div className="text-xs text-amber-300 mt-1">
                      Snapshot missing – sync to import holdings.
                    </div>
                  )}
                  {account.syncError && (
                    <div className="text-xs text-red-400 mt-1">Last error: {account.syncError}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSyncAccount(account.accountId)}
                    disabled={syncingAccountId === account.accountId}
                    className="px-3 py-1.5 rounded-md border border-white/[0.1] text-xs font-semibold hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {syncingAccountId === account.accountId ? 'Syncing…' : 'Sync from Zerodha'}
                  </button>
                  <button
                    onClick={() => handleReconnect(account.accountId)}
                    className="px-3 py-1.5 rounded-md border border-white/[0.06] text-[11px] text-white/60 hover:bg-white/[0.04] transition-colors"
                  >
                    Reconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {combinedHoldings.length > 0 ? (
          <>
            <div className="space-y-4">
              <PortfolioSummary holdings={combinedHoldings as Holding[]} />
              <div className="flex justify-end">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>Sort by:</span>
                  <button
                    onClick={() => handleSortChange('alphabetical')}
                    className={`px-2 py-1 rounded-md border text-[11px] ${
                      sortOption === 'alphabetical' ? 'border-white/60 text-white' : 'border-white/20'
                    }`}
                  >
                    Name {sortOption === 'alphabetical' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                  <button
                    onClick={() => handleSortChange('unrealized')}
                    className={`px-2 py-1 rounded-md border text-[11px] ${
                      sortOption === 'unrealized' ? 'border-white/60 text-white' : 'border-white/20'
                    }`}
                  >
                    P&L {sortOption === 'unrealized' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                  <button
                    onClick={() => handleSortChange('daily')}
                    className={`px-2 py-1 rounded-md border text-[11px] ${
                      sortOption === 'daily' ? 'border-white/60 text-white' : 'border-white/20'
                    }`}
                  >
                    Daily % {sortOption === 'daily' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                  <button
                    onClick={() => handleSortChange('invested')}
                    className={`px-2 py-1 rounded-md border text-[11px] ${
                      sortOption === 'invested' ? 'border-white/60 text-white' : 'border-white/20'
                    }`}
                  >
                    Invested {sortOption === 'invested' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </div>
              </div>
              <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] rounded-lg divide-y divide-white/[0.02]">
                {combinedHoldings.map((holding) => (
                  <HoldingCard
                    key={`${holding.ticker}-${holding.accountId || 'combined'}`}
                    holding={holding}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] rounded-lg p-6 text-center text-white/60">
            No holdings available yet. Sync from Zerodha to import your portfolio.
          </div>
        )}
      </div>
    </div>
  );
}
