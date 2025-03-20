import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PortfolioSummary from '../components/PortfolioSummary';
import MarketIndices from '../components/MarketIndices';
import GlobalMarkets from '../components/GlobalMarkets';
import Link from 'next/link';
import { Holding } from '../types/holding';

interface MarketData {
  topGainers: MarketStock[];
  topLosers: MarketStock[];
  indices: MarketIndex[];
}

interface MarketStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6">
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      {/* Portfolio Skeleton */}
      <SkeletonCard />

      {/* Market Movers Skeleton */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((section) => (
          <SkeletonMarketMovers key={section} />
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

const SkeletonMarketMovers = () => (
  <div className="space-y-3">
    <div className="h-3 w-32 bg-white/10 rounded"></div>
    <div className="space-y-px">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="backdrop-blur-md bg-white/[0.03] rounded border border-white/[0.06] p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-white/10 rounded"></div>
              <div className="h-3 w-32 bg-white/10 rounded"></div>
            </div>
            <div className="text-right space-y-1">
              <div className="h-4 w-16 bg-white/10 rounded"></div>
              <div className="h-3 w-12 bg-white/10 rounded"></div>
            </div>
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
  const [marketData, setMarketData] = useState<MarketData>({
    topGainers: [],
    topLosers: [],
    indices: [
      { name: 'SENSEX', value: 0, change: 0, changePercent: 0 },
      { name: 'NIFTY 50', value: 0, change: 0, changePercent: 0 }
    ]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const holdingsResponse = await fetch('/api/stockData');
        if (!holdingsResponse.ok) throw new Error('Failed to fetch holdings data');
        const holdingsData = await holdingsResponse.json();
        setHoldings(holdingsData);

        const [marketResponse, indicesResponse] = await Promise.all([
          fetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=10&scrIds=day_gainers,day_losers&region=IN'),
          fetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=^BSESN,^NSEI')
        ]);

        const [marketData, indicesData] = await Promise.all([
          marketResponse.json(),
          indicesResponse.json()
        ]);

        if (marketData.finance?.result) {
          setMarketData((prev) => ({
            ...prev,
            topGainers: marketData.finance.result[0]?.quotes || [],
            topLosers: marketData.finance.result[1]?.quotes || []
          }));
        }

        const quotes = indicesData.quoteResponse?.result;
        if (quotes?.length >= 2) {
          setMarketData((prev) => ({
            ...prev,
            indices: [
              {
                name: 'SENSEX',
                value: quotes[0].regularMarketPrice,
                change: quotes[0].regularMarketChange,
                changePercent: quotes[0].regularMarketChangePercent
              },
              {
                name: 'NIFTY 50',
                value: quotes[1].regularMarketPrice,
                change: quotes[1].regularMarketChange,
                changePercent: quotes[1].regularMarketChangePercent
              }
            ]
          }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  return isLoading ? <LoadingSkeleton /> : (
    <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <MarketIndices />
        <PortfolioSummary holdings={holdings} />
        <div className="flex justify-center mt-7">
          <Link href="/holdings" className="px-6 py-2 backdrop-blur-md bg-white/[0.03] hover:bg-white/[0.06] rounded-lg border border-white/[0.06] transition-colors">
            View Holdings
          </Link>
        </div>
        <GlobalMarkets />
      </div>
    </div>
  );
}