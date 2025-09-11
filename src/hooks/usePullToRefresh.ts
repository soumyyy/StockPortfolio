import { useState, useEffect, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
}

export const usePullToRefresh = ({ 
  onRefresh, 
  threshold = 80, 
  resistance = 0.5 
}: PullToRefreshOptions) => {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    canRefresh: false,
  });

  const [touchStart, setTouchStart] = useState<{ y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only trigger if we're at the top of the page
    if (window.scrollY === 0) {
      setTouchStart({
        y: e.touches[0].clientY,
        time: Date.now(),
      });
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart || state.isRefreshing) return;

    const touchY = e.touches[0].clientY;
    const pullDistance = Math.max(0, touchY - touchStart.y);
    const resistanceDistance = pullDistance * resistance;

    setState(prev => ({
      ...prev,
      isPulling: pullDistance > 10,
      pullDistance: resistanceDistance,
      canRefresh: resistanceDistance >= threshold,
    }));

    // Prevent default scrolling when pulling
    if (pullDistance > 0) {
      e.preventDefault();
    }
  }, [touchStart, state.isRefreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!touchStart || state.isRefreshing) return;

    const pullDuration = Date.now() - touchStart.time;
    
    // Only trigger refresh if:
    // 1. Pull distance is above threshold
    // 2. Pull was quick enough (not a slow drag)
    // 3. We're at the top of the page
    if (state.canRefresh && pullDuration < 1000 && window.scrollY === 0) {
      setState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false,
      }));

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
          canRefresh: false,
        }));
      }
    } else {
      // Reset state if refresh wasn't triggered
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false,
      }));
    }

    setTouchStart(null);
  }, [touchStart, state.canRefresh, state.isRefreshing, onRefresh]);

  useEffect(() => {
    const element = document.documentElement;
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    ...state,
    refreshTriggered: state.isRefreshing,
  };
};
