import { useState, useEffect } from 'react';

interface MarketStock {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MarketData {
  topGainers: MarketStock[];
  topLosers: MarketStock[];
}

export default function MarketMovers() {
  const [marketData, setMarketData] = useState<MarketData>({
    topGainers: [],
    topLosers: []
  });
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('/api/marketMovers');
        if (!response.ok) {
          throw new Error(`Failed to fetch market data: ${response.status}`);
        }
        const data = await response.json();
        setMarketData(data);
        setIsStale(false);
      } catch (error) {
        console.error('Error fetching market data:', error);
        setIsStale(true);
      }
    };

    fetchMarketData();
    const intervalId = setInterval(fetchMarketData, 300000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: 'decimal',
      useGrouping: true
    }).format(Math.abs(num));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800/60 p-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400">Top Gainers</div>
            {isStale && <div className="text-[10px] text-gray-500">Stale</div>}
          </div>
          <div className="space-y-1">
            {marketData.topGainers.map((stock) => (
              <div key={stock.symbol} className="bg-gray-800/30 backdrop-blur-sm rounded border border-gray-700/40 p-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-gray-200">{stock.symbol}</div>
                  <div className="text-[10px] text-emerald-400">+{stock.changePercent.toFixed(2)}%</div>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <div className="text-xs font-medium text-gray-300">₹{formatNumber(stock.price)}</div>
                  <div className="text-[10px] text-emerald-400">+₹{formatNumber(stock.change)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800/60 p-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400">Top Losers</div>
            {isStale && <div className="text-[10px] text-gray-500">Stale</div>}
          </div>
          <div className="space-y-1">
            {marketData.topLosers.map((stock) => (
              <div key={stock.symbol} className="bg-gray-800/30 backdrop-blur-sm rounded border border-gray-700/40 p-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-gray-200">{stock.symbol}</div>
                  <div className="text-[10px] text-rose-400">{stock.changePercent.toFixed(2)}%</div>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <div className="text-xs font-medium text-gray-300">₹{formatNumber(stock.price)}</div>
                  <div className="text-[10px] text-rose-400">₹{formatNumber(stock.change)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}