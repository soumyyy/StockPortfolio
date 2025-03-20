// src/pages/api/stockData.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import yahooFinance from 'yahoo-finance2';
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
    const holdings = await Promise.all(
      Object.entries(holdingsData).map(async ([ticker, data]: [string, any]): Promise<Holding> => {
        try {
          const quote = await yahooFinance.quote(ticker + '.NS');
          
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
        } catch (error) {
          console.error(`Error fetching data for ${ticker}:`, error);
          
          // Return a valid Holding object with fallback values
          return {
            ticker,
            name: ticker,
            buyPrice: data.averagePrice,
            quantity: data.quantity,
            lastTradedPrice: data.averagePrice,
            dailyChange: 0,
            dailyChangePercentage: 0,
            dayRange: 'N/A',
            volume: 0,
            averageBuyPrice: data.averagePrice,
            unrealizedPL: 0,
            unrealizedPLPercentage: 0
          };
        }
      })
    );

    res.status(200).json(holdings);
  } catch (error) {
    console.error('Error in stockData API:', error);
    res.status(500).json([]);
  }
}