import yahooFinance from 'yahoo-finance2';
import type { Quote } from 'yahoo-finance2/dist/esm/src/modules/quote';
import type { Holding } from '../types/holding';

async function fetchQuoteForTicker(ticker: string): Promise<Quote | null> {
  try {
    if (ticker.includes('.')) {
      return await yahooFinance.quote(ticker);
    }

    try {
      return await yahooFinance.quote(`${ticker}.NS`);
    } catch (nsError) {
      console.warn(`Could not fetch ${ticker}.NS, trying ${ticker}.BO`);
      return await yahooFinance.quote(`${ticker}.BO`);
    }
  } catch (error) {
    console.error(`Failed to fetch quote for ${ticker}`, error);
    return null;
  }
}

export async function applyMarketQuotes(holdings: Holding[]): Promise<Holding[]> {
  const cache = new Map<string, Quote | null>();

  async function getQuote(ticker: string) {
    if (cache.has(ticker)) {
      return cache.get(ticker) || null;
    }
    const quote = await fetchQuoteForTicker(ticker);
    cache.set(ticker, quote);
    return quote;
  }

  return Promise.all(
    holdings.map(async (holding) => {
      const quote = await getQuote(holding.ticker);
      if (!quote) {
        return holding;
      }

      const lastTradedPrice = quote.regularMarketPrice ?? holding.lastTradedPrice;
      const dailyChange = quote.regularMarketChange ?? holding.dailyChange;
      const dailyChangePercentage =
        quote.regularMarketChangePercent ?? holding.dailyChangePercentage;

      const quantity = holding.quantity;
      const invested = holding.averageBuyPrice * quantity;
      const currentValue = lastTradedPrice * quantity;
      const unrealizedPL = currentValue - invested;
      const unrealizedPLPercentage = invested === 0 ? 0 : (unrealizedPL / invested) * 100;

      return {
        ...holding,
        lastTradedPrice,
        dailyChange,
        dailyChangePercentage,
        unrealizedPL,
        unrealizedPLPercentage,
      };
    }),
  );
}
