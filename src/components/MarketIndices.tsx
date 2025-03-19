import { useState, useEffect } from 'react';

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  isStale?: boolean;
  lastUpdate?: string;
}

export default function MarketIndices() {
  const [indices, setIndices] = useState<MarketIndex[]>([
    { name: 'SENSEX', value: 0, change: 0, changePercent: 0, isStale: true },
    { name: 'NIFTY 50', value: 0, change: 0, changePercent: 0, isStale: true }
  ]);
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

    fetchIndicesData();
    const intervalId = setInterval(fetchIndicesData, 300000); // 5 minutes

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
      <div className="grid grid-cols-2 gap-2">
        {indices.map((index) => (
          <div
            key={index.name}
            className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-2"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/50">{index.name}</div>
              {index.isStale && (
                <div className="text-[10px] text-white/30">Stale</div>
              )}
            </div>
            <div className="mt-1 text-base">
              {formatNumber(index.value)}
            </div>
            <div className={`mt-0.5 text-xs ${
              index.change >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {index.change >= 0 ? '+' : ''}{formatNumber(index.change)} ({index.changePercent.toFixed(2)}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}