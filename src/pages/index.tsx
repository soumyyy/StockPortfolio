import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Holding } from '../types/holding';
import debounce from 'lodash.debounce';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefresh from '../components/PullToRefresh';

// Lazy load components for better performance
const PortfolioSummary = lazy(() => import('../components/PortfolioSummary'));
const MarketIndices = lazy(() => import('../components/MarketIndices'));
const GlobalMarkets = lazy(() => import('../components/GlobalMarkets'));
const StockCard = lazy(() => import('../components/StockCard'));

interface MarketData {
  indices: MarketIndex[];
}


interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface SearchStock {
  symbol: string;
  longname?: string;
  shortname?: string;
  regularMarketPrice: string | number;
  regularMarketChange: string | number;
  regularMarketChangePercent: string | number;
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6">
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      {/* Portfolio Skeleton */}
      <SkeletonCard />

      {/* Market Movers Skeleton */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((section) => (
        ))}
      </div> */}

      {/* Holdings Button Skeleton */}
      <SkeletonButton />

      {/* Global Markets Skeleton */}
      <SkeletonGlobalMarkets />
    </div>
  </div>
);

// Reusable Skeleton Components
const SkeletonCard = () => (
  <div className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-5 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {[1, 2, 3].map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-3 w-20 bg-white/10 rounded"></div>
          <div className="h-5 w-32 bg-white/10 rounded"></div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-14 bg-white/10 rounded"></div>
            <div className="h-3 w-20 bg-white/10 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);


const SkeletonButton = () => (
  <div className="flex justify-center mt-7">
    <div className="px-6 py-2 backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] animate-pulse w-32 h-10"></div>
  </div>
);

const SkeletonGlobalMarkets = () => (
  <div className="mt-8">
    <div className="h-4 w-32 bg-white/10 rounded mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-3.5 animate-pulse">
          <div className="h-4 w-24 bg-white/10 rounded mb-2"></div>
          <div className="h-6 w-32 bg-white/10 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

export default function Home() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [marketData, setMarketData] = useState<MarketData>({
    indices: [
      { name: 'SENSEX', value: 0, change: 0, changePercent: 0 },
      { name: 'NIFTY 50', value: 0, change: 0, changePercent: 0 }
    ]
  });

  // Pull to refresh functionality
  const refreshData = useCallback(async () => {
    try {
      setIsPageLoading(true);

        // Fetch holdings and market data in parallel
        const [holdingsResponse, indicesResponse] = await Promise.allSettled([
          fetch('/api/stockData', {
            headers: {
              'Cache-Control': 'max-age=60',
            },
          }),
          fetch('/api/indicesData', {
            headers: {
              'Cache-Control': 'max-age=60',
            },
          })
        ]);

      // Process holdings data
      if (holdingsResponse.status === 'fulfilled' && holdingsResponse.value.ok) {
        const holdingsData = await holdingsResponse.value.json();
        setHoldings(holdingsData);
      }


      // Process indices data
      if (indicesResponse.status === 'fulfilled' && indicesResponse.value.ok) {
        const indicesData = await indicesResponse.value.json();
        if (indicesData && Array.isArray(indicesData) && indicesData.length >= 2) {
          setMarketData(prev => ({
            ...prev,
            indices: [
              {
                name: 'SENSEX',
                value: indicesData[0].value || 0,
                change: indicesData[0].change || 0,
                changePercent: indicesData[0].changePercent || 0
              },
              {
                name: 'NIFTY 50',
                value: indicesData[1].value || 0,
                change: indicesData[1].change || 0,
                changePercent: indicesData[1].changePercent || 0
              }
            ]
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsPageLoading(false);
    }
  }, []);

  const { isPulling, isRefreshing, pullDistance, canRefresh } = usePullToRefresh({
    onRefresh: refreshData,
    threshold: 80,
    resistance: 0.5,
  });

  useEffect(() => {
    const fetchIndicesData = async () => {
      try {
        const indicesResponse = await fetch('/api/indicesData', {
          headers: {
            'Cache-Control': 'max-age=60',
          },
        });
        if (!indicesResponse.ok) {
          throw new Error(`Failed to fetch indices: ${indicesResponse.status}`);
        }
        
        const indicesData = await indicesResponse.json();
        if (!indicesData || !Array.isArray(indicesData) || indicesData.length < 2) {
          throw new Error('Invalid indices data format');
        }

        setMarketData(prev => ({
          ...prev,
          indices: [
            {
              name: 'SENSEX',
              value: indicesData[0].value || 0,
              change: indicesData[0].change || 0,
              changePercent: indicesData[0].changePercent || 0
            },
            {
              name: 'NIFTY 50',
              value: indicesData[1].value || 0,
              change: indicesData[1].change || 0,
              changePercent: indicesData[1].changePercent || 0
            }
          ]
        }));
      } catch (error) {
        console.error('Error fetching indices:', error);
      }
    };

    // Fetch immediately
    fetchIndicesData();
    
    // Set up interval for updates
    const indicesInterval = setInterval(fetchIndicesData, 300000); // 5 minutes
    return () => clearInterval(indicesInterval);
  }, []);

  useEffect(() => {
    const fetchHoldingsData = async () => {
      try {
        setIsPageLoading(true);

        // Fetch holdings data
        const holdingsResponse = await fetch('/api/stockData', {
          headers: {
            'Cache-Control': 'max-age=60',
          },
        });

        // Process holdings data
        if (holdingsResponse.ok) {
          const holdingsData = await holdingsResponse.json();
          setHoldings(holdingsData);
        }
      } catch (error) {
        console.error('Error fetching holdings data:', error);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchHoldingsData();
    const holdingsInterval = setInterval(fetchHoldingsData, 300000);
    return () => clearInterval(holdingsInterval);
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(`/api/searchStocks?query=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      console.log('Frontend received data:', data);

      if (Array.isArray(data)) {
        const mappedResults = data.map(stock => ({
          ticker: stock.symbol,
          name: stock.longname || stock.shortname || stock.symbol,
          price: stock.regularMarketPrice || 0,
          change: stock.regularMarketChange || 0,
          changePercent: stock.regularMarketChangePercent || 0
        }));

        console.log('Mapped results:', mappedResults);
        setSearchResults(mappedResults);
      } else {
        console.error('Invalid response format:', data);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search to avoid too many API calls
  const debouncedSearch = useCallback(
    debounce((query: string) => handleSearch(query), 300),
    []
  );

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      // Focus immediately and then again after a short delay to ensure it works on mobile
      searchInputRef.current?.focus();
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.click();
      }, 50);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  return isPageLoading ? <LoadingSkeleton /> : (
    <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6 safe-area-inset-top pb-safe">
      <PullToRefresh
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        canRefresh={canRefresh}
      />
      <div className="max-w-5xl mx-auto px-4 space-y-6 pt-safe">
        {/* Search Section */}
        <div className="flex items-center justify-between mb-6">
          <div className={`flex items-center gap-4 ${showSearch ? 'w-full' : ''}`}>
            <h2 className={`text-xs font-medium text-white/60 ${showSearch ? 'hidden sm:block' : 'block'}`}>
              Search
            </h2>
            <div className={`flex-1 sm:flex-initial transition-all duration-300 ease-in-out transform origin-right ${
              showSearch ? 'w-full sm:w-80 opacity-100 scale-x-100' : 'w-0 opacity-0 scale-x-0'
            } overflow-hidden`}>
              <div className="relative w-full">
                <input
                  ref={searchInputRef}
                  type="search"
                  inputMode="search"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  value={searchQuery}
                  onChange={handleSearchInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Search stocks..."
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:border-white/20 placeholder:text-white/40"
                />
                {isSearching && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                  </div>
                )}
                {showSearch && (
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
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
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="relative">
            <div className="fixed inset-x-4 sm:absolute sm:inset-x-0 z-20">
              <div className="backdrop-blur-md bg-[#0A0A0A]/95 rounded-lg border border-white/[0.06] overflow-hidden shadow-lg">
                <div className="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="divide-y divide-white/[0.06]">
                    {searchResults.map((stock) => (
                      <div key={stock.ticker}>
                        <Suspense fallback={<div className="h-16 bg-white/[0.03] rounded animate-pulse" />}>
                          <StockCard
                            stock={{
                              ticker: stock.ticker,
                              name: stock.name,
                              price: stock.price,
                              change: stock.change,
                              changePercent: stock.changePercent
                            }}
                          />
                        </Suspense>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-3 py-2 text-xs text-white/40 border-t border-white/[0.06] bg-white/[0.02]">
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }
        `}</style>

        <div 
          className={`transition-all duration-300 space-y-6 ${showSearch && searchResults.length > 0 ? 'opacity-30 pointer-events-auto cursor-pointer' : 'opacity-100'}`}
          onClick={() => {
            if (showSearch && searchResults.length > 0) {
              setShowSearch(false);
              setSearchQuery('');
              setSearchResults([]);
            }
          }}
        >
          <Suspense fallback={<div className="h-20 bg-white/[0.03] rounded-lg animate-pulse" />}>
            <MarketIndices indices={marketData.indices} error={false} />
          </Suspense>
          <div className="mt-6">
            <Suspense fallback={<div className="h-24 bg-white/[0.03] rounded-lg animate-pulse" />}>
              <PortfolioSummary holdings={holdings} />
            </Suspense>
          </div>
          <div className="flex justify-center mt-7">
            <Link href="/holdings" className="px-6 py-2 backdrop-blur-md bg-white/[0.03] hover:bg-white/[0.06] rounded-lg border border-white/[0.06] transition-colors">
              View Holdings
            </Link>
          </div>
          <div className="mt-6">
            <Suspense fallback={<div className="h-32 bg-white/[0.03] rounded-lg animate-pulse" />}>
              <GlobalMarkets />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}