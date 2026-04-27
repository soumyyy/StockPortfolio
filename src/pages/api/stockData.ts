// src/pages/api/stockData.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import YahooFinance from '../../lib/yahooFinance';
import { fetchEdgeConfigItems, readHoldingsFromItems } from '../../lib/edgeConfigHoldings';

const yahooFinance = YahooFinance;
import { Holding } from '../../types/holding';

type ExchangeSuffix = '.NS' | '.BO';
type QuoteLike = {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayLow?: number;
  regularMarketDayHigh?: number;
  regularMarketVolume?: number;
};

const preferredExchangeByTicker = new Map<string, ExchangeSuffix>();

function getPreferredSymbols(ticker: string) {
  const normalizedTicker = ticker.toUpperCase();

  if (normalizedTicker.includes('.')) {
    return [normalizedTicker];
  }

  const preferredSuffix = preferredExchangeByTicker.get(normalizedTicker);
  if (preferredSuffix) {
    return [`${normalizedTicker}${preferredSuffix}`];
  }

  return [`${normalizedTicker}.NS`, `${normalizedTicker}.BO`];
}

async function fetchQuotes(symbols: string[]) {
  if (symbols.length === 0) {
    return [] as QuoteLike[];
  }

  try {
    return await yahooFinance.quote(symbols, {}, { validateResult: false });
  } catch (error) {
    console.error('Batch quote fetch failed:', error);
    return [] as QuoteLike[];
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Holding[]>
) {
  // Set cache headers
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json');

  try {
    const items = await fetchEdgeConfigItems();
    const holdingsData = readHoldingsFromItems(items);
    const uniqueSymbols = new Set<string>();
    const normalizedTickers = Object.keys(holdingsData).map((ticker) => ticker.toUpperCase());

    normalizedTickers.forEach((ticker) => {
      getPreferredSymbols(ticker).forEach((symbol) => {
        uniqueSymbols.add(symbol);
      });
    });

    const symbols = Array.from(uniqueSymbols);
    const primaryQuotes: QuoteLike[] = await fetchQuotes(symbols);
    const quoteMap = new Map(primaryQuotes.map((quote: QuoteLike) => [quote.symbol.toUpperCase(), quote]));

    const fallbackSymbols = normalizedTickers.flatMap((ticker) => {
      if (ticker.includes('.')) {
        return [];
      }

      const preferredSuffix = preferredExchangeByTicker.get(ticker);
      if (!preferredSuffix) {
        return [];
      }

      const preferredSymbol = `${ticker}${preferredSuffix}`;
      if (quoteMap.has(preferredSymbol)) {
        return [];
      }

      const fallbackSuffix: ExchangeSuffix = preferredSuffix === '.NS' ? '.BO' : '.NS';
      return [`${ticker}${fallbackSuffix}`];
    });

    const fallbackQuotes: QuoteLike[] = await fetchQuotes(fallbackSymbols);
    fallbackQuotes.forEach((quote: QuoteLike) => {
      quoteMap.set(quote.symbol.toUpperCase(), quote);
    });

    const holdings = Object.entries(holdingsData).map(([ticker, data]: [string, any]): Holding => {
      const tickerUpper = ticker.toUpperCase();
      const quote = ticker.includes('.')
        ? quoteMap.get(tickerUpper)
        : quoteMap.get(`${tickerUpper}.NS`) || quoteMap.get(`${tickerUpper}.BO`);

      if (!ticker.includes('.')) {
        if (quoteMap.has(`${tickerUpper}.NS`)) {
          preferredExchangeByTicker.set(tickerUpper, '.NS');
        } else if (quoteMap.has(`${tickerUpper}.BO`)) {
          preferredExchangeByTicker.set(tickerUpper, '.BO');
        }
      }

      // If quote is still not found, return fallback data
      if (!quote) {
        return {
          ticker,
          name: ticker, // Fallback name
          buyPrice: data.averagePrice,
          quantity: data.quantity,
          lastTradedPrice: data.averagePrice, // Fallback price
          dailyChange: 0,
          dailyChangePercentage: 0,
          dayRange: 'N/A',
          volume: 0,
          averageBuyPrice: data.averagePrice,
          unrealizedPL: 0,
          unrealizedPLPercentage: 0
        };
      }

      const lastTradedPrice = quote.regularMarketPrice || data.averagePrice;
      const dailyChange = quote.regularMarketChange || 0;
      const dailyChangePercentage = quote.regularMarketChangePercent || 0;
      const unrealizedPL = (lastTradedPrice - data.averagePrice) * data.quantity;
      const unrealizedPLPercentage = ((lastTradedPrice - data.averagePrice) / data.averagePrice) * 100;

      return {
        ticker,
        name: quote.longName || quote.shortName || ticker,
        buyPrice: data.averagePrice,
        quantity: data.quantity,
        lastTradedPrice,
        dailyChange,
        dailyChangePercentage,
        dayRange: `${quote.regularMarketDayLow?.toFixed(2) || 'N/A'}-${quote.regularMarketDayHigh?.toFixed(2) || 'N/A'}`,
        volume: quote.regularMarketVolume || 0,
        averageBuyPrice: data.averagePrice,
        unrealizedPL,
        unrealizedPLPercentage
      };
    });

    res.status(200).json(holdings);
  } catch (error) {
    console.error('Error in stockData API:', error);
    res.status(500).json([]);
  }
}
