interface EdgeConfigItem {
  key: string;
  value?: unknown;
}

export interface StoredHolding {
  averagePrice: number;
  quantity: number;
}

const HOLDING_KEY_PREFIX = 'holding:';
const LEGACY_HOLDINGS_KEY = 'holdings';

function getEdgeConfigEnv() {
  const id = process.env.EDGE_CONFIG_ID;
  const token = process.env.VERCEL_ACCESS_TOKEN;

  if (!id || !token) {
    throw new Error('Edge Config environment variables are not set');
  }

  return { id, token };
}

function getEdgeConfigItemsUrl() {
  const { id } = getEdgeConfigEnv();
  return `https://api.vercel.com/v1/edge-config/${id}/items`;
}

function getEdgeConfigHeaders() {
  const { token } = getEdgeConfigEnv();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function toStoredHolding(value: unknown): StoredHolding | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const holding = value as Record<string, unknown>;
  const averagePrice = Number(holding.averagePrice);
  const quantity = Number(holding.quantity);

  if (!Number.isFinite(averagePrice) || !Number.isFinite(quantity)) {
    return null;
  }

  if (averagePrice <= 0 || quantity <= 0) {
    return null;
  }

  return {
    averagePrice: Number(averagePrice.toFixed(2)),
    quantity,
  };
}

function extractLegacyHoldings(items: EdgeConfigItem[]) {
  const legacyItem = items.find((item) => item.key === LEGACY_HOLDINGS_KEY);

  if (!legacyItem?.value || typeof legacyItem.value !== 'object') {
    return {} as Record<string, StoredHolding>;
  }

  const holdings = legacyItem.value as Record<string, unknown>;

  return Object.entries(holdings).reduce<Record<string, StoredHolding>>((acc, [ticker, value]) => {
    const parsed = toStoredHolding(value);
    if (parsed) {
      acc[normalizeTicker(ticker)] = parsed;
    }
    return acc;
  }, {});
}

export async function fetchEdgeConfigItems(): Promise<EdgeConfigItem[]> {
  const response = await fetch(getEdgeConfigItemsUrl(), {
    headers: {
      Authorization: getEdgeConfigHeaders().Authorization,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch holdings from Edge Config');
  }

  return response.json();
}

export function readHoldingsFromItems(items: EdgeConfigItem[]) {
  const holdings = extractLegacyHoldings(items);

  for (const item of items) {
    if (!item.key.startsWith(HOLDING_KEY_PREFIX)) {
      continue;
    }

    const ticker = normalizeTicker(item.key.slice(HOLDING_KEY_PREFIX.length));
    const parsed = toStoredHolding(item.value);

    if (parsed) {
      holdings[ticker] = parsed;
      continue;
    }

    delete holdings[ticker];
  }

  return holdings;
}

export async function writeHoldingToEdgeConfig(ticker: string, holding: StoredHolding | null) {
  const normalizedTicker = normalizeTicker(ticker);
  const response = await fetch(getEdgeConfigItemsUrl(), {
    method: 'PATCH',
    headers: getEdgeConfigHeaders(),
    body: JSON.stringify({
      items: [
        {
          key: `${HOLDING_KEY_PREFIX}${normalizedTicker}`,
          value: holding,
          operation: 'upsert',
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.error?.message || await response.text();
    throw new Error(`Failed to update holdings: ${errorMessage}`);
  }
}
