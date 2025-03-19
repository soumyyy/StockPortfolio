import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PortfolioSummary from '../components/PortfolioSummary';
import Link from 'next/link';
import { Holding } from '../types/holding';
import MarketIndices from '../components/MarketIndices';
import MarketMovers from '../components/MarketMovers';
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
      {/* Market Indices Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2].map((index) => (
          <div key={index} className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-3.5 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-white/10 rounded"></div>
              <div className="h-3 w-12 bg-white/10 rounded"></div>
            </div>
            <div className="mt-1">
              <div className="h-5 w-24 bg-white/10 rounded"></div>
            </div>
            <div className="mt-1">
              <div className="h-3 w-16 bg-white/10 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Portfolio Summary Skeleton */}
      <div className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-5 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Current Value */}
          <div className="space-y-2">
            <div className="h-3 w-20 bg-white/10 rounded"></div>
            <div className="h-5 w-32 bg-white/10 rounded"></div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-14 bg-white/10 rounded"></div>
              <div className="h-3 w-20 bg-white/10 rounded"></div>
            </div>
          </div>

          {/* Day's P&L */}
          <div className="space-y-2">
            <div className="h-3 w-20 bg-white/10 rounded"></div>
            <div className="flex items-baseline gap-2">
              <div className="h-5 w-28 bg-white/10 rounded"></div>
              <div className="h-3 w-16 bg-white/10 rounded"></div>
            </div>
            <div className="h-0.5 w-full bg-white/[0.03] rounded-full">
              <div className="h-full w-1/2 bg-white/10 rounded-full"></div>
            </div>
          </div>

          {/* Overall P&L */}
          <div className="space-y-2">
            <div className="h-3 w-20 bg-white/10 rounded"></div>
            <div className="flex items-baseline gap-2">
              <div className="h-5 w-28 bg-white/10 rounded"></div>
              <div className="h-3 w-16 bg-white/10 rounded"></div>
            </div>
            <div className="h-0.5 w-full bg-white/[0.03] rounded-full">
              <div className="h-full w-1/2 bg-white/10 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Movers Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((section) => (
          <div key={section} className="space-y-3">
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
        ))}
      </div>

      {/* View Holdings Button Skeleton */}
      <div className="flex justify-center mt-7">
        <div className="h-8 w-32 bg-white/[0.03] rounded border border-white/[0.06]"></div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({
    topGainers: [],
    topLosers: [],
    indices: [
      { name: 'SENSEX', value: 72500.33, change: 862.02, changePercent: 1.2 },
      { name: 'NIFTY 50', value: 21982.80, change: 235.65, changePercent: 1.1 }
    ]
  });
  const [isLoading, setIsLoading] = useState(true);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(Math.abs(num));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch holdings data
        const holdingsResponse = await fetch('/api/stockData');
        const holdingsData = await holdingsResponse.json();
        setHoldings(holdingsData);

        // Fetch market data (top gainers/losers)
        const marketResponse = await fetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=10&scrIds=day_gainers,day_losers&region=IN');
        const marketData = await marketResponse.json();

        if (marketData.finance?.result) {
          setMarketData(prevData => ({
            ...prevData,
            topGainers: marketData.finance.result[0]?.quotes || [],
            topLosers: marketData.finance.result[1]?.quotes || []
          }));
        }

        // Fetch indices data
        const indicesResponse = await fetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=^BSESN,^NSEI');
        const indicesData = await indicesResponse.json();
        const quotes = indicesData.quoteResponse?.result;

        if (quotes && quotes.length >= 2) {
          setMarketData(prevData => ({
            ...prevData,
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

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <MarketIndices />
        <PortfolioSummary holdings={holdings} />

        {/* <MarketMovers /> */}

        <div className="flex justify-center mt-7">
          <Link href="/holdings" className="text-xs px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded transition-all duration-200">
            View Holdings
          </Link>
        </div>
      </div>
    </div>
  );
}