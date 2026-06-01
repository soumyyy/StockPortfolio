import { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import debounce from 'lodash.debounce';
import { useHoldingsData, useIndicesData } from '../hooks/usePortfolioData';

// Lazy load components for better performance
const PortfolioSummary = lazy(() => import('../components/PortfolioSummary'));
const MarketIndices = lazy(() => import('../components/MarketIndices'));
const GlobalMarkets = lazy(() => import('../components/GlobalMarkets'));
const StockCard = lazy(() => import('../components/StockCard'));

interface SearchResult {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const skeletonCard = 'backdrop-blur-md bg-white/[0.025] rounded-lg border border-white/[0.06] animate-pulse';
const skeletonBlock = 'rounded-md bg-black/40 border border-white/[0.03]';

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6">
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      <SkeletonSearch />
      <SkeletonMarketIndices />
      <SkeletonPortfolio />
      <SkeletonHoldingsCTA />
      <SkeletonGlobalMarkets />
    </div>
  </div>
);

const SkeletonSearch = () => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4 flex-1">
      <div className={`h-4 w-16 ${skeletonBlock}`}></div>
      <div className={`flex-1 sm:w-72 h-9 ${skeletonBlock} animate-pulse`}></div>
    </div>
    <div className={`ml-4 h-9 w-9 ${skeletonBlock} animate-pulse`}></div>
  </div>
);

const SkeletonMarketIndices = () => (
  <div className="grid grid-cols-2 gap-3">
    {[1, 2].map((item) => (
      <div key={item} className={`${skeletonCard} p-3 space-y-2`}>
        <div className={`h-3 w-16 ${skeletonBlock}`}></div>
        <div className={`h-5 w-24 ${skeletonBlock}`}></div>
        <div className={`h-3 w-20 ${skeletonBlock}`}></div>
      </div>
    ))}
  </div>
);

const SkeletonPortfolio = () => (
  <div className={`${skeletonCard} p-5 space-y-4`}>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-2">
          <div className={`h-3 w-20 ${skeletonBlock}`}></div>
          <div className={`h-5 w-32 ${skeletonBlock}`}></div>
          <div className={`h-2.5 w-24 ${skeletonBlock}`}></div>
        </div>
      ))}
    </div>
  </div>
);

const SkeletonHoldingsCTA = () => (
  <div className="flex justify-center">
    <div className={`w-36 h-10 ${skeletonBlock} animate-pulse`}></div>
  </div>
);

const SkeletonGlobalMarkets = () => (
  <div className="space-y-3">
    <div className={`h-4 w-36 ${skeletonBlock}`}></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`${skeletonCard} p-3.5 space-y-3`}>
          <div className={`h-3 w-24 ${skeletonBlock}`}></div>
          <div className={`h-5 w-28 ${skeletonBlock}`}></div>
          <div className={`h-3 w-20 ${skeletonBlock}`}></div>
        </div>
      ))}
    </div>
  </div>
);

export default function Home() {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  const {
    data: holdings,
    isLoading: isHoldingsLoading,
  } = useHoldingsData();
  const {
    data: indices,
    isLoading: isIndicesLoading,
  } = useIndicesData();
  const isPageLoading = isHoldingsLoading || isIndicesLoading;

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(`/api/searchStocks?query=${encodeURIComponent(query.trim())}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        const mappedResults: SearchResult[] = data.map(stock => ({
          ticker: stock.symbol,
          name: stock.longname || stock.shortname || stock.symbol,
          price: stock.regularMarketPrice || 0,
          change: stock.regularMarketChange || 0,
          changePercent: stock.regularMarketChangePercent || 0
        }));

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
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      void handleSearch(query);
    }, 300),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

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
    <div className="min-h-screen bg-[#0A0A0A] text-white/90 pt-4 pb-6 safe-area-inset-top pb-safe">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.reload()}
              className="px-3 py-1.5 text-sm text-white/70 hover:text-white/90 hover:bg-white/[0.03] rounded-lg border border-white/[0.06] transition-colors"
              aria-label="Reload data"
            >
              Reload
            </button>
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
            <MarketIndices indices={indices} error={false} />
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
