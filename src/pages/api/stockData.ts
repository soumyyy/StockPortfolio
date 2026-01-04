// src/pages/api/stockData.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import YahooFinance from '../../lib/yahooFinance';

const yahooFinance = YahooFinance;
import { Holding } from '../../types/holding';

// Initialize Edge Config
const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const EDGE_CONFIG_TOKEN = process.env.VERCEL_ACCESS_TOKEN;

if (!EDGE_CONFIG_ID || !EDGE_CONFIG_TOKEN) {
  throw new Error('Edge Config environment variables are not set');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Holding[]>
) {
  // Set cache headers
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Fetch holdings from Edge Config
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`, {
      headers: {
        'Authorization': `Bearer ${EDGE_CONFIG_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch holdings from Edge Config');
    }

    const items = await response.json();
    const holdingsItem = items.find((item: any) => item.key === 'holdings');

    if (!holdingsItem) {
      throw new Error('No holdings found in Edge Config');
    }

    const holdingsData = holdingsItem.value;

    // Fetch real-time data for all tickers
    // Collect all symbols to fetch
    const uniqueSymbols = new Set<string>();

    // We iterate holdingsData keys
    Object.keys(holdingsData).forEach((ticker) => {
      if (ticker.includes('.')) {
        uniqueSymbols.add(ticker);
      } else {
        uniqueSymbols.add(`${ticker}.NS`);
        uniqueSymbols.add(`${ticker}.BO`);
      }
    });

    const symbols = Array.from(uniqueSymbols);
    console.log(`Fetching ${symbols.length} symbols...`);

    let quotes: any[] = [];
    try {
      if (symbols.length > 0) {
        // Use validateResult: false to allow partial success if possible or less strict validation
        quotes = await yahooFinance.quote(symbols, {}, { validateResult: false });
      }
    } catch (e) {
      console.error("Batch quote fetch failed:", e);
      quotes = [];
    }

    const quoteMap = new Map(quotes.map(q => [q.symbol.toUpperCase(), q]));

    const holdings = Object.entries(holdingsData).map(([ticker, data]: [string, any]): Holding => {
      let quote;
      const tickerUpper = ticker.toUpperCase();
      if (ticker.includes('.')) {
        quote = quoteMap.get(tickerUpper);
      } else {
        // Prefer NS, then BO
        quote = quoteMap.get(`${tickerUpper}.NS`) || quoteMap.get(`${tickerUpper}.BO`);
      }

      // If quote is still not found, return fallback data
      if (!quote) {
        console.error(`Data for ticker ${ticker} not found on NSE or BSE (checked batch results). Using fallback data.`);
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