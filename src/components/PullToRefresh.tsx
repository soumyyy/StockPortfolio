import React from 'react';

interface PullToRefreshProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  isPulling,
  isRefreshing,
  pullDistance,
  canRefresh,
}) => {
  if (!isPulling && !isRefreshing) return null;

  const progress = Math.min(pullDistance / 80, 1);
  const rotation = progress * 180;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/[0.06]"
      style={{
        height: `${Math.min(pullDistance, 80)}px`,
        transform: `translateY(${Math.min(pullDistance - 80, 0)}px)`,
        transition: isRefreshing ? 'height 0.3s ease-out' : 'none',
      }}
    >
      <div className="flex items-center gap-3 text-white/70">
        {isRefreshing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
            <span className="text-sm font-medium">Refreshing...</span>
          </>
        ) : (
          <>
            <div
              className="w-5 h-5 border-2 border-white/30 border-t-white/70 rounded-full transition-transform duration-200"
              style={{
                transform: `rotate(${rotation}deg)`,
                opacity: progress,
              }}
            />
            <span 
              className={`text-sm font-medium transition-colors duration-200 ${
                canRefresh ? 'text-white/90' : 'text-white/50'
              }`}
            >
              {canRefresh ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default PullToRefresh;
