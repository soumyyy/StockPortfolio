import { useState, useEffect } from 'react';

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

interface MarketData {
  globalIndices: MarketIndex[];
  crypto: MarketIndex[];
}

const formatNumber = (num: number, minimumFractionDigits: number = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(num);
};

const formatCurrency = (value: number, currency: string) => {
  if (currency === 'USD') return `$${formatNumber(value)}`;
  return `${formatNumber(value)} ${currency}`;
};

const MarketCard = ({ data }: { data: MarketIndex }) => {
  const isPositive = data.change >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-3.5 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm text-white/50">{data.name}</h3>
          <p className="text-xs font-semibold mt-0.5 text-white">
            {formatCurrency(data.price, data.currency)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xs ${changeColor}`}>
            {isPositive ? '+' : ''}{formatNumber(data.changePercent, 2)}%
          </p>
          <p className={`text-xs mt-0.5 ${changeColor}`}>
            {isPositive ? '+' : ''}{formatCurrency(data.change, data.currency)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function GlobalMarkets() {
  const [marketData, setMarketData] = useState<MarketData>({
    globalIndices: [],
    crypto: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('/api/F-marketData');
        const data = await response.json();
        setMarketData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching market data:', error);
        setIsLoading(false);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Global Markets Skeleton */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white/90">Global Markets</h2>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-3.5 animate-pulse">
                <div className="h-4 w-24 bg-white/10 rounded mb-2"></div>
                <div className="h-6 w-32 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Crypto Markets Skeleton */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white/90">Cryptocurrency</h2>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-3.5 animate-pulse">
                <div className="h-4 w-24 bg-white/10 rounded mb-2"></div>
                <div className="h-6 w-32 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white/90">Global Markets</h2>
        <div className="grid grid-cols-2 gap-3">
          {marketData.globalIndices.map((index) => (
            <MarketCard key={index.symbol} data={index} />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white/90">Cryptocurrency</h2>
        <div className="grid grid-cols-2 gap-3">
          {marketData.crypto.map((crypto) => (
            <MarketCard key={crypto.symbol} data={crypto} />
          ))}
        </div>
      </div>
    </div>
  );
}