import { useState, useEffect } from 'react';

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  isStale?: boolean;
  lastUpdate?: string;
}

interface MarketIndicesProps {
  indices: MarketIndex[];
  error?: boolean;
}

export default function MarketIndices({ indices, error }: MarketIndicesProps) {
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