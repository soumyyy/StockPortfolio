import { useCallback, useEffect, useMemo, useState } from 'react';
import { Holding } from '../types/holding';

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  isStale?: boolean;
  lastUpdate?: string;
}

export interface GlobalMarketEntry {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface GlobalMarketsData {
  globalIndices: GlobalMarketEntry[];
  crypto: GlobalMarketEntry[];
}

interface ResourceCacheEntry<T> {
  data?: T;
  updatedAt?: number;
  promise?: Promise<T>;
  requestId?: number;
}

interface UseCachedResourceOptions<T> {
  cacheKey: string;
  url: string;
  intervalMs: number;
  staleMs: number;
  initialData: T;
  transform?: (value: unknown) => T;
}

const DEFAULT_FETCH_OPTIONS: RequestInit = {
  cache: 'no-store',
};

const resourceCache = new Map<string, ResourceCacheEntry<unknown>>();

function getCacheEntry<T>(cacheKey: string) {
  const cached = resourceCache.get(cacheKey) as ResourceCacheEntry<T> | undefined;
  if (cached) {
    return cached;
  }

  const nextEntry: ResourceCacheEntry<T> = {};
  resourceCache.set(cacheKey, nextEntry);
  return nextEntry;
}

async function fetchCachedResource<T>({
  cacheKey,
  url,
  staleMs,
  transform,
  force = false,
}: {
  cacheKey: string;
  url: string;
  staleMs: number;
  transform?: (value: unknown) => T;
  force?: boolean;
}) {
  const entry = getCacheEntry<T>(cacheKey);
  const isFresh = entry.updatedAt && Date.now() - entry.updatedAt < staleMs;

  if (!force && isFresh && entry.data !== undefined) {
    return entry.data;
  }

  if (!force && entry.promise) {
    return entry.promise;
  }

  const requestId = (entry.requestId ?? 0) + 1;
  entry.requestId = requestId;

  entry.promise = fetch(url, DEFAULT_FETCH_OPTIONS)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch ${cacheKey}: ${response.status}`);
      }

      const payload = await response.json();
      const data = transform ? transform(payload) : (payload as T);
      if (entry.requestId === requestId) {
        entry.data = data;
        entry.updatedAt = Date.now();
      }
      return data;
    })
    .finally(() => {
      if (entry.requestId === requestId) {
        entry.promise = undefined;
      }
    });

  return entry.promise;
}

function useCachedResource<T>({
  cacheKey,
  url,
  intervalMs,
  staleMs,
  initialData,
  transform,
}: UseCachedResourceOptions<T>) {
  const cachedEntry = useMemo(() => getCacheEntry<T>(cacheKey), [cacheKey]);
  const [data, setData] = useState<T>(cachedEntry.data ?? initialData);
  const [isLoading, setIsLoading] = useState(cachedEntry.data === undefined);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (force = true) => {
    if (cachedEntry.data === undefined) {
      setIsLoading(true);
    }

    try {
      const nextData = await fetchCachedResource<T>({
        cacheKey,
        url,
        staleMs,
        transform,
        force,
      });

      setData(nextData);
      setError(null);
      return nextData;
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError : new Error('Unknown fetch error'));
      throw fetchError;
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, cachedEntry.data, staleMs, transform, url]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const nextData = await fetchCachedResource<T>({
          cacheKey,
          url,
          staleMs,
          transform,
          force: false,
        });

        if (!isMounted) {
          return;
        }

        setData(nextData);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError : new Error('Unknown fetch error'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    const intervalId = window.setInterval(() => {
      void fetchCachedResource<T>({
        cacheKey,
        url,
        staleMs,
        transform,
        force: true,
      }).then((nextData) => {
        if (!isMounted) {
          return;
        }

        setData(nextData);
        setError(null);
      }).catch((fetchError) => {
        if (!isMounted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError : new Error('Unknown fetch error'));
      });
    }, intervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [cacheKey, intervalMs, staleMs, transform, url]);

  return {
    data,
    error,
    isLoading,
    refresh,
  };
}

const DEFAULT_INDICES: MarketIndex[] = [
  { name: 'SENSEX', value: 0, change: 0, changePercent: 0 },
  { name: 'NIFTY 50', value: 0, change: 0, changePercent: 0 },
];

const DEFAULT_GLOBAL_MARKETS: GlobalMarketsData = {
  globalIndices: [],
  crypto: [],
};

function transformIndices(payload: unknown): MarketIndex[] {
  if (!Array.isArray(payload) || payload.length < 2) {
    throw new Error('Invalid indices data format');
  }

  return [
    {
      name: 'SENSEX',
      value: Number(payload[0]?.value) || 0,
      change: Number(payload[0]?.change) || 0,
      changePercent: Number(payload[0]?.changePercent) || 0,
    },
    {
      name: 'NIFTY 50',
      value: Number(payload[1]?.value) || 0,
      change: Number(payload[1]?.change) || 0,
      changePercent: Number(payload[1]?.changePercent) || 0,
    },
  ];
}

function transformGlobalMarkets(payload: unknown): GlobalMarketsData {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid global markets data format');
  }

  const data = payload as Record<string, unknown>;
  const globalIndices = Array.isArray(data.globalIndices) ? data.globalIndices : [];
  const crypto = Array.isArray(data.crypto) ? data.crypto : [];

  return {
    globalIndices: globalIndices.map((entry) => ({
      symbol: String((entry as Record<string, unknown>).symbol || ''),
      name: String((entry as Record<string, unknown>).name || ''),
      price: Number((entry as Record<string, unknown>).price) || 0,
      change: Number((entry as Record<string, unknown>).change) || 0,
      changePercent: Number((entry as Record<string, unknown>).changePercent) || 0,
      currency: String((entry as Record<string, unknown>).currency || 'USD'),
    })),
    crypto: crypto.map((entry) => ({
      symbol: String((entry as Record<string, unknown>).symbol || ''),
      name: String((entry as Record<string, unknown>).name || ''),
      price: Number((entry as Record<string, unknown>).price) || 0,
      change: Number((entry as Record<string, unknown>).change) || 0,
      changePercent: Number((entry as Record<string, unknown>).changePercent) || 0,
      currency: String((entry as Record<string, unknown>).currency || 'USD'),
    })),
  };
}

export function useHoldingsData() {
  return useCachedResource<Holding[]>({
    cacheKey: 'holdings',
    url: '/api/stockData',
    intervalMs: 300000,
    staleMs: 60000,
    initialData: [],
  });
}

export function useIndicesData() {
  return useCachedResource<MarketIndex[]>({
    cacheKey: 'indices',
    url: '/api/indicesData',
    intervalMs: 300000,
    staleMs: 60000,
    initialData: DEFAULT_INDICES,
    transform: transformIndices,
  });
}

export function useGlobalMarketsData() {
  return useCachedResource<GlobalMarketsData>({
    cacheKey: 'global-markets',
    url: '/api/F-marketData',
    intervalMs: 300000,
    staleMs: 300000,
    initialData: DEFAULT_GLOBAL_MARKETS,
    transform: transformGlobalMarkets,
  });
}
