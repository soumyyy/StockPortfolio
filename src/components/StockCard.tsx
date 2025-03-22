// src/components/StockCard.tsx
interface StockInfo {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface StockCardProps {
  stock: StockInfo;
}

const StockCard: React.FC<StockCardProps> = ({ stock }) => {
  console.log('StockCard rendering:', {
    ticker: stock.ticker,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent
  });

  const isPositive = stock.change > 0;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(Math.abs(num));
  };

  return (
    <div className="p-3 hover:bg-white/[0.01] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white/90">{stock.ticker}</h3>
            <div className={`text-[11px] ${isPositive ? 'text-green-400/70' : 'text-red-400/70'}`}>
              {isPositive ? '+' : ''}{formatNumber(stock.changePercent)}%
            </div>
          </div>
          <div className="text-[11px] text-white/90 font-normal">{stock.name}</div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm text-white/90">₹{formatNumber(stock.price)}</div>
          <div className={`text-[11px] ${isPositive ? 'text-green-400/70' : 'text-red-400/70'}`}>
            {isPositive ? '+' : ''}₹{formatNumber(stock.change)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockCard;