// src/components/HoldingCard.tsx
import { Holding } from '../types/holding';

interface HoldingCardProps {
  holding: Holding;
}

export default function HoldingCard({ holding }: HoldingCardProps) {
  const isPositive = holding.unrealizedPLPercentage > 0;
  const dailyChangeIsPositive = holding.dailyChangePercentage > 0;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(Math.abs(num));
  };

  return (
    <div className="p-3 hover:bg-white/[0.01] transition-all duration-200 backdrop-blur-sm">
      <div className="space-y-1.5">
        {/* Top Section: Quantity and Average */}
        <div className="flex items-center justify-between text-[11px] text-white/50">
          <div>
            <span className="mr-2">Qty: {formatNumber(holding.quantity)}</span>
            <span>Avg: ₹{formatNumber(holding.averageBuyPrice)}</span>
          </div>
        </div>

        {/* Middle Section: Stock Info */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white/90">{holding.ticker}</h3>
            </div>
            <div className="text-[11px] text-white/50 font-normal">{holding.name}</div>
          </div>
          
          <div className="text-right">
            <div className={`text-sm font-medium ${isPositive ? 'text-green-400/90' : 'text-red-400/90'}`}>
              {isPositive ? '+' : ''}₹{formatNumber(holding.unrealizedPL)}
            </div>
            <div className={`text-[11px] ${isPositive ? 'text-green-400/70' : 'text-red-400/70'}`}>
              {isPositive ? '+' : ''}{formatNumber(holding.unrealizedPLPercentage)}%
            </div>
          </div>
        </div>

        {/* Bottom Section: Investment and LTP */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="text-white/50">
            Invested: ₹{formatNumber(holding.quantity * holding.averageBuyPrice)}
          </div>
          <div className="text-right">
            <span className="mr-2 text-white/50">LTP: ₹{formatNumber(holding.lastTradedPrice)}</span>
            <span className={`${dailyChangeIsPositive ? 'text-green-400/80' : 'text-red-400/80'}`}>
              {dailyChangeIsPositive ? '+' : ''}{formatNumber(holding.dailyChangePercentage)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}