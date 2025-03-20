import { useState, useEffect } from 'react';
import HoldingCard from '../components/HoldingCard';
import PortfolioSummary from '../components/PortfolioSummary';
import { Holding } from '../types/holding';
import MarketIndices from '../components/MarketIndices';
import Link from 'next/link';

type SortOption = 'unrealizedPL' | 'dailyChangePercentage' | 'alphabetical';

interface SortConfig {
  key: SortOption;
  direction: 'asc' | 'desc';
}

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  isStale?: boolean;
  lastUpdate?: string;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6">
      <div className="max-w-5xl mx-auto px-4">

        <div className="space-y-6">
          {/* Market Indices */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-3.5 animate-pulse">
                <div className="h-4 w-24 bg-white/10 rounded mb-2"></div>
                <div className="h-6 w-32 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>

          {/* Portfolio Summary Skeleton */}
          <div className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 bg-white/10 rounded animate-pulse"></div>
                  <div className="h-5 w-32 bg-white/10 rounded animate-pulse"></div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-14 bg-white/10 rounded animate-pulse"></div>
                    <div className="h-3 w-20 bg-white/10 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Holdings List Skeleton */}
          <div className="space-y-3">
            {/* Sort Controls Skeleton */}
            <div className="flex justify-end">
              <div className="h-8 w-32 bg-white/[0.03] rounded animate-pulse"></div>
            </div>

            {/* Holdings Cards */}
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-4">
                  <div className="flex flex-col space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="h-5 w-32 bg-white/10 rounded animate-pulse"></div>
                        <div className="h-4 w-24 bg-white/10 rounded animate-pulse"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-5 w-24 bg-white/10 rounded animate-pulse mb-1"></div>
                        <div className="h-4 w-20 bg-white/10 rounded animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Details (initially hidden) */}
                    <div className="pt-3 border-t border-white/[0.06] hidden">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="h-4 w-20 bg-white/10 rounded animate-pulse"></div>
                          <div className="h-5 w-28 bg-white/10 rounded animate-pulse"></div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-4 w-20 bg-white/10 rounded animate-pulse"></div>
                          <div className="h-5 w-28 bg-white/10 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'decimal',
    useGrouping: true
  }).format(Math.abs(num));
};

export default function Holdings() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'alphabetical', direction: 'asc' });
  const [indices, setIndices] = useState<MarketIndex[]>([
    { name: 'SENSEX', value: 0, change: 0, changePercent: 0, isStale: true },
    { name: 'NIFTY 50', value: 0, change: 0, changePercent: 0, isStale: true }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [indicesError, setIndicesError] = useState(false);

  useEffect(() => {
    const fetchIndicesData = async () => {
      try {
        const indicesResponse = await fetch('/api/indicesData');
        if (!indicesResponse.ok) {
          throw new Error(`Failed to fetch indices: ${indicesResponse.status}`);
        }
        
        const indicesData = await indicesResponse.json();
        if (!indicesData || !Array.isArray(indicesData) || indicesData.length < 2) {
          throw new Error('Invalid indices data format');
        }

        setIndices([
          {
            name: 'SENSEX',
            value: indicesData[0].value || 0,
            change: indicesData[0].change || 0,
            changePercent: indicesData[0].changePercent || 0,
            lastUpdate: new Date().toISOString(),
            isStale: false
          },
          {
            name: 'NIFTY 50',
            value: indicesData[1].value || 0,
            change: indicesData[1].change || 0,
            changePercent: indicesData[1].changePercent || 0,
            lastUpdate: new Date().toISOString(),
            isStale: false
          }
        ]);
        setIndicesError(false);
      } catch (error) {
        console.error('Error fetching indices data:', error);
        setIndicesError(true);
        setIndices(prev => prev.map(index => ({
          ...index,
          isStale: true,
          lastUpdate: new Date().toISOString()
        })));
      }
    };

    const fetchHoldingsData = async () => {
      try {
        const holdingsResponse = await fetch('/api/stockData');
        const holdingsData = await holdingsResponse.json();
        setHoldings(holdingsData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching holdings data:', error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchIndicesData();
    fetchHoldingsData();

    // Set up intervals
    const indicesInterval = setInterval(fetchIndicesData, 60000); // Update indices every minute
    const holdingsInterval = setInterval(fetchHoldingsData, 300000); // Update holdings every 5 minutes

    return () => {
      clearInterval(indicesInterval);
      clearInterval(holdingsInterval);
    };
  }, []);

  const sortedHoldings = [...holdings].sort((a, b) => {
    switch (sortConfig.key) {
      case 'unrealizedPL':
        return sortConfig.direction === 'asc' ? a.unrealizedPL - b.unrealizedPL : b.unrealizedPL - a.unrealizedPL;
      case 'dailyChangePercentage':
        return sortConfig.direction === 'asc' ? a.dailyChangePercentage - b.dailyChangePercentage : b.dailyChangePercentage - a.dailyChangePercentage;
      case 'alphabetical':
        return sortConfig.direction === 'asc' ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      default:
        return 0;
    }
  });

  const gainers = holdings.filter(stock => stock.unrealizedPLPercentage > 0).length;
  const losers = holdings.filter(stock => stock.unrealizedPLPercentage < 0).length;
  const topGainer = [...holdings].sort((a, b) => b.unrealizedPLPercentage - a.unrealizedPLPercentage)[0];
  const topLoser = [...holdings].sort((a, b) => a.unrealizedPLPercentage - b.unrealizedPLPercentage)[0];

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 text-sm">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center text-sm text-white/70 hover:text-white/90 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <MarketIndices/>
            {/* Portfolio Summary and Holdings List */}
            <PortfolioSummary holdings={holdings} />

            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-medium text-white/60">Holdings</h2>
                <div className="flex rounded-md overflow-hidden border border-white/[0.06]">
                  <button
                    onClick={() => setSortConfig({ key: 'alphabetical', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    className={`px-3 py-1.5 text-[11px] transition-all ${
                      sortConfig.key === 'alphabetical'
                        ? 'bg-white/[0.06] text-white/90'
                        : 'text-white/50 hover:bg-white/[0.03]'
                    }`}
                  >
                    A-Z
                  </button>
                  <button
                    onClick={() => setSortConfig({ key: 'unrealizedPL', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    className={`px-3 py-1.5 text-[11px] border-l border-white/[0.06] transition-all ${
                      sortConfig.key === 'unrealizedPL'
                        ? 'bg-white/[0.06] text-white/90'
                        : 'text-white/50 hover:bg-white/[0.03]'
                    }`}
                  >
                    P&L
                  </button>
                  <button
                    onClick={() => setSortConfig({ key: 'dailyChangePercentage', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    className={`px-3 py-1.5 text-[11px] border-l border-white/[0.06] transition-all ${
                      sortConfig.key === 'dailyChangePercentage'
                        ? 'bg-white/[0.06] text-white/90'
                        : 'text-white/50 hover:bg-white/[0.03]'
                    }`}
                  >
                    Daily %
                  </button>
                </div>
              </div>

              <div className="divide-y divide-white/[0.08]">
                {sortedHoldings.map((stock) => (
                  <HoldingCard key={stock.ticker} stock={stock} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}