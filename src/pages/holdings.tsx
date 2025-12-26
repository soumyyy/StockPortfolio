import { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import { Holding } from '../types/holding';
import Link from 'next/link';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefresh from '../components/PullToRefresh';
import EditHoldingModal from '../components/EditHoldingModal';

// Lazy load components for better performance
const HoldingCard = lazy(() => import('../components/HoldingCard'));
const PortfolioSummary = lazy(() => import('../components/PortfolioSummary'));
const MarketIndices = lazy(() => import('../components/MarketIndices'));

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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    holding: Holding | null;
    isNew: boolean;
  }>({
    isOpen: false,
    holding: null,
    isNew: false
  });

  // Pull to refresh functionality
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch both indices and holdings data in parallel
      const [indicesResponse, holdingsResponse] = await Promise.allSettled([
        fetch('/api/indicesData', {
          headers: {
            'Cache-Control': 'max-age=60',
          },
        }),
        fetch('/api/stockData', {
          headers: {
            'Cache-Control': 'max-age=60',
          },
        })
      ]);

      // Process indices data
      if (indicesResponse.status === 'fulfilled' && indicesResponse.value.ok) {
        const indicesData = await indicesResponse.value.json();
        if (indicesData && Array.isArray(indicesData) && indicesData.length >= 2) {
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
        }
      }

      // Process holdings data
      if (holdingsResponse.status === 'fulfilled' && holdingsResponse.value.ok) {
        const holdingsData = await holdingsResponse.value.json();
        setHoldings(holdingsData);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { isPulling, isRefreshing, pullDistance, canRefresh } = usePullToRefresh({
    onRefresh: refreshData,
    threshold: 80,
    resistance: 0.5,
  });

  // Edit/Delete functions
  const handleEditHolding = (holding: Holding) => {
    setEditModal({
      isOpen: true,
      holding,
      isNew: false
    });
  };

  const handleAddHolding = () => {
    setEditModal({
      isOpen: true,
      holding: null,
      isNew: true
    });
  };

  const handleDeleteHolding = async (ticker: string) => {
    try {
      const response = await fetch('/api/updateHolding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker,
          quantity: 0,
          averagePrice: 0,
          action: 'delete'
        }),
      });

      if (response.ok) {
        // Refresh data
        await refreshData();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error deleting holding:', error);
      alert('Failed to delete holding');
      throw error;
    }
  };

  const handleSaveHolding = async (data: { ticker: string; quantity: number; averagePrice: number }) => {
    try {
      const normalizedTicker = data.ticker.trim().toUpperCase();
      const existingHolding = holdings.find(
        (holding) => holding.ticker.toUpperCase() === normalizedTicker
      );

      let payload = {
        ticker: normalizedTicker,
        quantity: data.quantity,
        averagePrice: data.averagePrice,
        action: editModal.isNew ? 'add' : 'update' as 'add' | 'update',
      };

      if (editModal.isNew && existingHolding) {
        const totalQuantity = existingHolding.quantity + data.quantity;
        const totalValue = (existingHolding.quantity * existingHolding.averageBuyPrice) + (data.quantity * data.averagePrice);
        const newAverage = totalQuantity === 0 ? 0 : totalValue / totalQuantity;

        payload = {
          ticker: normalizedTicker,
          quantity: totalQuantity,
          averagePrice: Number(newAverage.toFixed(2)),
          action: 'update',
        };
      }

      const response = await fetch('/api/updateHolding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Refresh data
        await refreshData();
        return;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error saving holding:', error);
      throw error;
    }
  };

  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      holding: null,
      isNew: false
    });
  };

  // Handle search toggle
  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch && searchInputRef.current) {
      // Focus the input when search bar appears
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  // Filter holdings based on search
  const filteredHoldings = holdings.filter(holding => 
    holding.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    holding.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const gainers = holdings.filter(stock => stock.unrealizedPLPercentage > 0).length;
  const losers = holdings.filter(stock => stock.unrealizedPLPercentage < 0).length;
  const topGainer = [...holdings].sort((a, b) => b.unrealizedPLPercentage - a.unrealizedPLPercentage)[0];
  const topLoser = [...holdings].sort((a, b) => a.unrealizedPLPercentage - b.unrealizedPLPercentage)[0];

  return isLoading ? <LoadingSkeleton /> : (
    <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6 safe-area-inset-top pb-safe">
      <PullToRefresh
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        canRefresh={canRefresh}
      />
      <div className="max-w-5xl mx-auto px-4 space-y-6 pt-safe">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center text-sm text-white/70 hover:text-white/90 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
        </div>
        <Suspense fallback={<div className="h-20 bg-white/[0.03] rounded-lg animate-pulse" />}>
          <MarketIndices indices={indices} error={indicesError} />
        </Suspense>
        <Suspense fallback={<div className="h-24 bg-white/[0.03] rounded-lg animate-pulse" />}>
          <PortfolioSummary holdings={holdings} />
        </Suspense>
        
        {/* Holdings Section Header */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-4 ${showSearch ? 'w-full sm:w-auto' : ''}`}>
            <h2 className={`text-xs font-medium text-white/60 ${showSearch ? 'hidden sm:block' : 'block'}`}>Holdings</h2>
            <button
              onClick={handleAddHolding}
              className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] rounded-lg text-xs text-white/70 transition-colors"
            >
              Add
            </button>
            {/* Search Bar */}
            <div className={`flex-1 sm:flex-initial transition-all duration-300 ease-in-out transform origin-right ${
              showSearch ? 'w-full sm:w-48 opacity-100 scale-x-100' : 'w-0 opacity-0 scale-x-0'
            } overflow-hidden`}>
              <div className="relative w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stocks..."
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:border-white/20 placeholder:text-white/40"
                />
                {showSearch && (
                  <button
                    onClick={toggleSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/[0.03] rounded-lg transition-colors"
                    aria-label="Close search"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4 text-white/60"
                    >
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Toggle Button */}
            <button
              onClick={toggleSearch}
              className={`p-2 hover:bg-white/[0.03] rounded-lg transition-all duration-300 ease-in-out transform ${
                showSearch ? 'hidden sm:block opacity-0 sm:opacity-100 scale-0 sm:scale-100' : 'block opacity-100 scale-100'
              }`}
              aria-label="Toggle search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 text-white/60"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            
            {/* Sort Buttons */}
            <div className={`flex h-8 rounded-md overflow-hidden border border-white/[0.06] transition-all duration-300 ease-in-out transform origin-right ${
              showSearch ? 'hidden sm:flex opacity-0 sm:opacity-100 scale-x-0 sm:scale-x-100' : 'flex opacity-100 scale-x-100'
            }`}>
              <button
                onClick={() => setSortConfig({ 
                  key: 'alphabetical', 
                  direction: sortConfig.key === 'alphabetical' && sortConfig.direction === 'asc' ? 'desc' : 'asc' 
                })}
                className={`h-full px-3 text-[11px] transition-all ${
                  sortConfig.key === 'alphabetical'
                    ? 'bg-white/[0.06] text-white/90'
                    : 'text-white/50 hover:bg-white/[0.03]'
                }`}
              >
                A-Z
              </button>
              <button
                onClick={() => setSortConfig({ 
                  key: 'unrealizedPL', 
                  direction: sortConfig.key === 'unrealizedPL' && sortConfig.direction === 'asc' ? 'desc' : 'asc' 
                })}
                className={`h-full px-3 text-[11px] border-l border-white/[0.06] transition-all ${
                  sortConfig.key === 'unrealizedPL'
                    ? 'bg-white/[0.06] text-white/90'
                    : 'text-white/50 hover:bg-white/[0.03]'
                }`}
              >
                P&L
              </button>
              <button
                onClick={() => setSortConfig({ 
                  key: 'dailyChangePercentage', 
                  direction: sortConfig.key === 'dailyChangePercentage' && sortConfig.direction === 'asc' ? 'desc' : 'asc' 
                })}
                className={`h-full px-3 text-[11px] border-l border-white/[0.06] transition-all ${
                  sortConfig.key === 'dailyChangePercentage'
                    ? 'bg-white/[0.06] text-white/90'
                    : 'text-white/50 hover:bg-white/[0.03]'
                }`}
              >
                Daily %
              </button>
            </div>
          </div>
        </div>

        {/* Holdings List */}
        <div className="space-y-3">
          {filteredHoldings
            .sort((a, b) => {
              const direction = sortConfig.direction === 'asc' ? 1 : -1;
              switch (sortConfig.key) {
                case 'alphabetical':
                  return direction * a.ticker.localeCompare(b.ticker);
                case 'unrealizedPL':
                  return direction * (a.unrealizedPL - b.unrealizedPL);
                case 'dailyChangePercentage':
                  return direction * (a.dailyChangePercentage - b.dailyChangePercentage);
                default:
                  return 0;
              }
            })
            .map((holding) => (
              <Suspense key={holding.ticker} fallback={<div className="h-20 bg-white/[0.03] rounded-lg animate-pulse" />}>
                <HoldingCard 
                  holding={holding} 
                  onEdit={handleEditHolding}
                  // onDelete={handleDeleteHolding} // Commented out for now
                />
              </Suspense>
            ))}
        </div>
      </div>
      
      {/* Edit Modal */}
      <EditHoldingModal
        isOpen={editModal.isOpen}
        onClose={closeEditModal}
        holding={editModal.holding}
        isNew={editModal.isNew}
        onSave={handleSaveHolding}
        onDelete={handleDeleteHolding}
      />
    </div>
  );
}
