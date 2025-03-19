// src/components/PortfolioSummary.tsx
import { Holding } from '../types/holding';

interface PortfolioSummaryProps {
  holdings: Holding[];
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ holdings }) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: 'decimal',
      useGrouping: true
    }).format(Math.abs(num));
  };

  // Calculate portfolio metrics
  const totalInvested = holdings.reduce((sum, stock) => sum + stock.averageBuyPrice * stock.quantity, 0);
  const currentValue = holdings.reduce((sum, stock) => sum + stock.lastTradedPrice * stock.quantity, 0);
  const overallPL = currentValue - totalInvested;
  const overallPLPercentage = (overallPL / totalInvested) * 100;

  const dailyPL = holdings.reduce((sum, stock) => {
    const stockValue = stock.lastTradedPrice * stock.quantity;
    return sum + (stockValue * stock.dailyChangePercentage / 100);
  }, 0);
  const dailyPLPercentage = (dailyPL / currentValue) * 100;

  return (
    <div className="backdrop-blur-md bg-white/[0.03] rounded-lg border border-white/[0.06] p-4 sm:p-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="space-y-1">
          <div className="text-xs font-medium text-white/60">Current Value</div>
          <div className="text-lg font-medium text-white/90">
            ₹{formatNumber(currentValue)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Invested</span>
            <span className="text-xs font-medium text-white/70">₹{formatNumber(totalInvested)}</span>
          </div>
        </div>

        <div className="col-span-1 sm:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-white/60">Day's P&L</div>
              <div className="flex items-baseline gap-2">
                <div className={`text-xs sm:text-lg font-semibold ${dailyPL >= 0 ? 'text-green-400/90' : 'text-red-400/90'}`}>
                  {dailyPL >= 0 ? '+' : '-'}₹{formatNumber(dailyPL)}
                </div>
                <div className={`text-xs ${dailyPL >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                  ({dailyPLPercentage >= 0 ? '+' : ''}{formatNumber(dailyPLPercentage)}%)
                </div>
              </div>
              <div className="h-0.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${dailyPL >= 0 ? 'bg-green-400/30' : 'bg-red-400/30'}`}
                  style={{ width: `${Math.min(Math.abs(dailyPLPercentage), 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-white/60">Overall P&L</div>
              <div className="flex items-baseline gap-2">
                <div className={`text-xs sm:text-lg font-semibold ${overallPL >= 0 ? 'text-green-400/90' : 'text-red-400/90'}`}>
                  {overallPL >= 0 ? '+' : '-'}₹{formatNumber(overallPL)}
                </div>
                <div className={`text-xs ${overallPL >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                  ({overallPLPercentage >= 0 ? '+' : ''}{formatNumber(overallPLPercentage)}%)
                </div>
              </div>
              <div className="h-0.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${overallPL >= 0 ? 'bg-green-400/30' : 'bg-red-400/30'}`}
                  style={{ width: `${Math.min(Math.abs(overallPLPercentage), 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;