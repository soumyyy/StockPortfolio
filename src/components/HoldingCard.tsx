// src/components/HoldingCard.tsx
import { Holding } from '../types/holding';

interface HoldingCardProps {
  holding: Holding;
  onEdit?: (holding: Holding) => void;
  onDelete?: (ticker: string) => void;
}

export default function HoldingCard({ holding, onEdit, onDelete }: HoldingCardProps) {
  const isPositive = holding.unrealizedPLPercentage > 0;
  const dailyChangeIsPositive = holding.dailyChangePercentage > 0;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(Math.abs(num));
  };

  const handleEditClick = () => {
    onEdit?.(holding);
  };

  return (
    <div 
      className="p-3 hover:bg-white/[0.01] transition-all duration-200 backdrop-blur-sm relative group"
    >
      <div className="space-y-1.5">
        {/* Top Section: Quantity and Average */}
        <div className="flex items-center justify-between text-[11px] text-white/50">
          <div>
            <span className="mr-2">Qty: {formatNumber(holding.quantity)}</span>
            <span>Avg: ₹{formatNumber(holding.averageBuyPrice)}</span>
          </div>
          {/* Action Buttons */}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="p-1 hover:bg-white/[0.05] rounded transition-colors text-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  title="Edit holding"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {/* Delete button commented out for now */}
            </div>
          )}
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
