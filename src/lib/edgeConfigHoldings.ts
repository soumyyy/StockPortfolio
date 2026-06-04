interface EdgeConfigItem {
  key: string;
  value?: unknown;
}

export interface StoredHolding {
  averagePrice: number;
  quantity: number;
}

const HOLDING_KEY_PREFIX = 'holding_';
const LEGACY_HOLDING_KEY_PREFIX = 'holding:';
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
  return ticker.trim().toUpperCase().replace(/\.BS$/, '.BO');
}

function decodeTickerKey(encodedTicker: string) {
  try {
    return normalizeTicker(Buffer.from(encodedTicker, 'base64url').toString('utf8'));
  } catch {
    return '';
  }
}

function getRedundantHoldingKeys(items: EdgeConfigItem[]) {
  return items
    .filter((item) => item.key.startsWith(HOLDING_KEY_PREFIX) || item.key.startsWith(LEGACY_HOLDING_KEY_PREFIX))
    .map((item) => item.key);
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
    let ticker = '';

    if (item.key.startsWith(HOLDING_KEY_PREFIX)) {
      ticker = decodeTickerKey(item.key.slice(HOLDING_KEY_PREFIX.length));
    } else if (item.key.startsWith(LEGACY_HOLDING_KEY_PREFIX)) {
      ticker = normalizeTicker(item.key.slice(LEGACY_HOLDING_KEY_PREFIX.length));
    }

    if (!ticker) {
      continue;
    }

    const parsed = toStoredHolding(item.value);

    if (parsed) {
      holdings[ticker] = parsed;
      continue;
    }

    delete holdings[ticker];
  }

  return holdings;
}

export async function writeHoldingsToEdgeConfig(
  holdings: Record<string, StoredHolding>,
  items: EdgeConfigItem[] = []
) {
  const normalizedHoldings = Object.entries(holdings).reduce<Record<string, StoredHolding>>((acc, [ticker, holding]) => {
    const parsed = toStoredHolding(holding);
    if (parsed) {
      acc[normalizeTicker(ticker)] = parsed;
    }
    return acc;
  }, {});

  const patchItems = [
    {
      key: LEGACY_HOLDINGS_KEY,
      value: normalizedHoldings,
      operation: 'upsert',
    },
    ...getRedundantHoldingKeys(items).map((key) => ({
      key,
      operation: 'delete',
    })),
  ];

  const response = await fetch(getEdgeConfigItemsUrl(), {
    method: 'PATCH',
    headers: getEdgeConfigHeaders(),
    body: JSON.stringify({
      items: patchItems,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.error?.message || await response.text();
    throw new Error(`Failed to update holdings: ${errorMessage}`);
  }
}

export async function writeHoldingToEdgeConfig(ticker: string, holding: StoredHolding | null) {
  const items = await fetchEdgeConfigItems();
  const holdings = readHoldingsFromItems(items);
  const normalizedTicker = normalizeTicker(ticker);

  if (holding) {
    holdings[normalizedTicker] = holding;
  } else {
    delete holdings[normalizedTicker];
  }

  await writeHoldingsToEdgeConfig(holdings, items);
}
