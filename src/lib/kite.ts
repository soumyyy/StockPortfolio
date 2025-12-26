import { createHash } from 'crypto';
import { z } from 'zod';
import {
  kiteAccounts,
  getKiteAccountConfig,
  getPublicKiteAccounts,
} from '../config/kiteAccounts';
import { getStoredAccessToken } from './kiteTokenStore';
import type { Holding } from '../types/holding';
import type { AccountPortfolio, Position } from '../types/portfolio';

const KITE_API_BASE = 'https://api.kite.trade';

const kiteHoldingSchema = z.object({
  tradingsymbol: z.string(),
  exchange: z.string().optional().default('NSE'),
  instrument_token: z.number().optional().default(0),
  last_price: z.number().optional().default(0),
  average_price: z.number().optional().default(0),
  quantity: z.number().optional().default(0),
  pnl: z.number().optional().default(0),
  t1_quantity: z.number().optional().default(0),
  day_change: z.number().optional().default(0),
  day_change_percentage: z.number().optional().default(0),
  product: z.string().optional().default('CNC'),
  collateral_quantity: z.number().optional().default(0),
  collateral_type: z.string().optional().nullable(),
});

const kitePositionSchema = z.object({
  tradingsymbol: z.string(),
  product: z.string().optional().default('NRML'),
  exchange: z.string().optional().default('NSE'),
  quantity: z.number().optional().default(0),
  overnight_quantity: z.number().optional().default(0),
  average_price: z.number().optional().default(0),
  last_price: z.number().optional().default(0),
  pnl: z.number().optional().default(0),
});

const kiteHoldingsResponseSchema = createKiteSuccessSchema(z.array(kiteHoldingSchema));

const kitePositionsResponseSchema = createKiteSuccessSchema(
  z.object({
    net: z.array(kitePositionSchema),
    day: z.array(kitePositionSchema),
  }),
);

const kiteSessionResponseSchema = createKiteSuccessSchema(
  z.object({
    access_token: z.string(),
    public_token: z.string().optional(),
  }),
);

const kiteErrorResponseSchema = z.object({
  status: z.literal('error'),
  message: z.string().default('Kite request failed'),
  error_type: z.string().optional(),
});

type KiteSuccessResponse<T extends z.ZodTypeAny> = z.ZodObject<{
  status: z.ZodLiteral<'success'>;
  data: T;
}>;

class KiteAuthRequiredError extends Error {
  constructor(
    public readonly accountId: string,
    message?: string,
  ) {
    super(message || 'Kite authentication required.');
    this.name = 'KiteAuthRequiredError';
  }
}

function createKiteSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T): KiteSuccessResponse<T> {
  return z.object({
    status: z.literal('success'),
    data: dataSchema,
  });
}

async function kiteFetch<T extends z.ZodTypeAny>(
  accountId: string,
  path: string,
  schema: KiteSuccessResponse<T>,
) {
  const account = getKiteAccountConfig(accountId);
  const accessToken = await getStoredAccessToken(accountId);

  if (!accessToken) {
    throw new KiteAuthRequiredError(accountId, `Kite access token missing for ${account.label}.`);
  }

  const response = await fetch(`${KITE_API_BASE}${path}`, {
    headers: {
      Authorization: `token ${account.apiKey}:${accessToken}`,
      'X-Kite-Version': '3',
    },
  });

  const payloadText = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    throw new Error(`Unexpected Kite response for ${path}: ${payloadText}`);
  }

  if (!response.ok || (payload as any)?.status === 'error') {
    try {
      const parsedError = kiteErrorResponseSchema.parse(payload);
      if (parsedError.error_type === 'TokenException' || response.status === 401) {
        throw new KiteAuthRequiredError(accountId, parsedError.message);
      }
      throw new Error(parsedError.message);
    } catch (error) {
      if (error instanceof KiteAuthRequiredError) {
        throw error;
      }
      throw new Error(
        `Kite API error (${account.label} ${path}): ${
          (payload as any)?.message || 'Unknown error'
        }`,
      );
    }
  }

  const parsed: z.infer<typeof schema> = schema.parse(payload);
  return parsed.data;
}

function normalizeHolding(
  holding: z.infer<typeof kiteHoldingSchema>,
  accountId: string,
  accountLabel: string,
): Holding {
  const settledQty = Number(holding.quantity || 0);
  const t1Qty = Number(holding.t1_quantity || 0);
  const quantity = settledQty + t1Qty;
  const averagePrice = Number(holding.average_price || 0);
  const lastPrice = Number(holding.last_price || 0);
  const buyPrice = averagePrice;
  const invested = averagePrice * quantity;
  const currentValue = lastPrice * quantity;
  const pnl = currentValue - invested;

  return {
    ticker: holding.tradingsymbol,
    name: holding.tradingsymbol,
    buyPrice,
    quantity,
    lastTradedPrice: buyPrice,
    dailyChange: 0,
    dailyChangePercentage: 0,
    dayRange: 'N/A',
    volume: 0,
    averageBuyPrice: averagePrice,
    unrealizedPL: 0,
    unrealizedPLPercentage: 0,
    accountId,
    accountLabel,
  };
}

function normalizePosition(
  position: z.infer<typeof kitePositionSchema>,
  accountId: string,
): Position {
  return {
    accountId,
    tradingsymbol: position.tradingsymbol,
    product: position.product,
    exchange: position.exchange,
    quantity: position.quantity,
    overnightQuantity: position.overnight_quantity,
    averagePrice: position.average_price,
    lastTradedPrice: position.last_price,
    pnl: position.pnl,
  };
}

function mergeHoldings(holdings: Holding[]): Holding[] {
  const map = new Map<
    string,
    {
      ticker: string;
      name: string;
      totalQuantity: number;
      totalInvested: number;
      totalCurrentValue: number;
      totalDailyChangeValue: number;
    }
  >();

  holdings.forEach((holding) => {
    const key = holding.ticker;
    const invested = holding.averageBuyPrice * holding.quantity;
    const currentValue = holding.lastTradedPrice * holding.quantity;
    const dailyChangeValue = (holding.dailyChangePercentage / 100) * currentValue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ticker: holding.ticker,
        name: holding.name,
        totalQuantity: holding.quantity,
        totalInvested: invested,
        totalCurrentValue: currentValue,
        totalDailyChangeValue: dailyChangeValue,
      });
    } else {
      existing.totalQuantity += holding.quantity;
      existing.totalInvested += invested;
      existing.totalCurrentValue += currentValue;
      existing.totalDailyChangeValue += dailyChangeValue;
    }
  });

  return Array.from(map.values()).map((entry) => {
    const quantity = entry.totalQuantity;
    const averageBuyPrice = quantity === 0 ? 0 : entry.totalInvested / quantity;
    const lastTradedPrice = quantity === 0 ? 0 : entry.totalCurrentValue / quantity;
    const unrealizedPL = entry.totalCurrentValue - entry.totalInvested;
    const unrealizedPLPercentage =
      entry.totalInvested === 0 ? 0 : (unrealizedPL / entry.totalInvested) * 100;
    const dailyChangePercentage =
      entry.totalCurrentValue === 0
        ? 0
        : (entry.totalDailyChangeValue / entry.totalCurrentValue) * 100;
    const dailyChange = quantity === 0 ? 0 : entry.totalDailyChangeValue / quantity;

    return {
      ticker: entry.ticker,
      name: entry.name,
      buyPrice: averageBuyPrice,
      quantity,
      lastTradedPrice,
      dailyChange,
      dailyChangePercentage,
      dayRange: 'N/A',
      volume: 0,
      averageBuyPrice,
      unrealizedPL,
      unrealizedPLPercentage,
    };
  });
}

function mergePositions(positions: Position[]): Position[] {
  const map = new Map<
    string,
    {
      tradingsymbol: string;
      product: string;
      exchange: string;
      quantity: number;
      overnightQuantity: number;
      averagePriceTotal: number;
      lastPriceTotal: number;
      totalQuantityForAverage: number;
      pnl: number;
    }
  >();

  positions.forEach((position) => {
    const key = `${position.exchange}:${position.product}:${position.tradingsymbol}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        tradingsymbol: position.tradingsymbol,
        product: position.product,
        exchange: position.exchange,
        quantity: position.quantity,
        overnightQuantity: position.overnightQuantity,
        averagePriceTotal: position.averagePrice * position.quantity,
        lastPriceTotal: position.lastTradedPrice * position.quantity,
        totalQuantityForAverage: position.quantity,
        pnl: position.pnl,
      });
    } else {
      existing.quantity += position.quantity;
      existing.overnightQuantity += position.overnightQuantity;
      existing.averagePriceTotal += position.averagePrice * position.quantity;
      existing.lastPriceTotal += position.lastTradedPrice * position.quantity;
      existing.totalQuantityForAverage += position.quantity;
      existing.pnl += position.pnl;
    }
  });

  return Array.from(map.values()).map((entry) => ({
    accountId: 'combined',
    tradingsymbol: entry.tradingsymbol,
    product: entry.product,
    exchange: entry.exchange,
    quantity: entry.quantity,
    overnightQuantity: entry.overnightQuantity,
    averagePrice:
      entry.totalQuantityForAverage === 0
        ? 0
        : entry.averagePriceTotal / entry.totalQuantityForAverage,
    lastTradedPrice:
      entry.totalQuantityForAverage === 0
        ? 0
        : entry.lastPriceTotal / entry.totalQuantityForAverage,
    pnl: entry.pnl,
  }));
}

export async function fetchPortfolioForAccount(accountId: string) {
  const account = getKiteAccountConfig(accountId);
  const holdingsData = await kiteFetch(accountId, '/portfolio/holdings', kiteHoldingsResponseSchema);
  const positionsData = await kiteFetch(accountId, '/portfolio/positions', kitePositionsResponseSchema);

  const holdings = holdingsData.map((holding) =>
    normalizeHolding(holding, account.id, account.label),
  );
  const positions = positionsData.net.map((position) => normalizePosition(position, account.id));

  const fetchedAt = new Date().toISOString();
  const portfolio: AccountPortfolio = {
    accountId: account.id,
    accountLabel: account.label,
    holdings,
    positions,
    fetchedAt,
  };

  return portfolio;
}

export async function fetchCombinedPortfolio() {
  const accounts: AccountPortfolio[] = [];
  const reauthRequiredAccounts: string[] = [];
  const errors: { accountId?: string; message: string }[] = [];

  for (const account of kiteAccounts) {
    try {
      const portfolio = await fetchPortfolioForAccount(account.id);
      accounts.push(portfolio);
    } catch (error) {
      if (error instanceof KiteAuthRequiredError) {
        reauthRequiredAccounts.push(error.accountId);
        errors.push({ accountId: error.accountId, message: error.message });
      } else {
        console.error(`Failed to fetch Kite data for ${account.label}`, error);
        errors.push({
          accountId: account.id,
          message: error instanceof Error ? error.message : 'Failed to fetch Kite data',
        });
      }
    }
  }

  const flattenedHoldings = accounts.flatMap((account) => account.holdings);
  const flattenedPositions = accounts.flatMap((account) => account.positions);

  const combinedHoldings = flattenedHoldings.length ? mergeHoldings(flattenedHoldings) : [];
  const combinedPositions = flattenedPositions.length ? mergePositions(flattenedPositions) : [];
  const latestTimestamp =
    accounts.length > 0
      ? accounts
          .map((account) => Date.parse(account.fetchedAt))
          .reduce((max, current) => Math.max(max, current), 0)
      : null;

  return {
    accounts,
    accountMetadata: getPublicKiteAccounts(),
    combined: {
      holdings: combinedHoldings,
      positions: combinedPositions,
      fetchedAt: latestTimestamp ? new Date(latestTimestamp).toISOString() : null,
    },
    reauthRequiredAccounts,
    errors,
  };
}

export async function exchangeRequestToken(accountId: string, requestToken: string) {
  const account = getKiteAccountConfig(accountId);
  const checksum = createChecksum(account.apiKey, requestToken, account.apiSecret);

  const response = await fetch(`${KITE_API_BASE}/session/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      api_key: account.apiKey,
      request_token: requestToken,
      checksum,
    }).toString(),
  });

  const payloadText = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    throw new Error(`Unexpected Kite token response: ${payloadText}`);
  }

  if (!response.ok || (payload as any)?.status === 'error') {
    const parsedError = kiteErrorResponseSchema.safeParse(payload);
    if (parsedError.success) {
      throw new Error(parsedError.data.message);
    }
    throw new Error(`Failed to exchange Kite request token for ${account.label}.`);
  }

  const parsed = kiteSessionResponseSchema.parse(payload);
  return parsed.data.access_token;
}

function createChecksum(apiKey: string, requestToken: string, apiSecret: string) {
  return createHash('sha256').update(`${apiKey}${requestToken}${apiSecret}`).digest('hex');
}

export { KiteAuthRequiredError, mergeHoldings, mergePositions };
