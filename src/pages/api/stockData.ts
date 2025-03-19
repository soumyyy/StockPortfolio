// src/pages/api/stockData.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import yahooFinance from 'yahoo-finance2';
import { Holding } from '../../types/holding';

interface CsvHolding {
  ticker: string;
  averagePrice: number;
  quantity: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Holding[]>
) {
  try {
    // Read holdings from CSV
    const csvFilePath = path.join(process.cwd(), 'src/data/holdings.csv');
    const csvFile = fs.readFileSync(csvFilePath, 'utf8');
    const { data } = Papa.parse<CsvHolding>(csvFile, { header: true, dynamicTyping: true });

    // Fetch real-time data for all tickers
    const holdings = await Promise.all(
      data.map(async (holding): Promise<Holding> => {
        try {
          const quote = await yahooFinance.quote(holding.ticker + '.NS');
          
          const lastTradedPrice = quote.regularMarketPrice || holding.averagePrice;
          const dailyChange = quote.regularMarketChange || 0;
          const dailyChangePercentage = quote.regularMarketChangePercent || 0;
          const unrealizedPL = (lastTradedPrice - holding.averagePrice) * holding.quantity;
          const unrealizedPLPercentage = ((lastTradedPrice - holding.averagePrice) / holding.averagePrice) * 100;

          return {
            ticker: holding.ticker,
            name: quote.longName || quote.shortName || holding.ticker,
            buyPrice: holding.averagePrice,
            quantity: holding.quantity,
            lastTradedPrice,
            dailyChange,
            dailyChangePercentage,
            dayRange: `${quote.regularMarketDayLow?.toFixed(2) || 'N/A'}-${quote.regularMarketDayHigh?.toFixed(2) || 'N/A'}`,
            volume: quote.regularMarketVolume || 0,
            averageBuyPrice: holding.averagePrice,
            unrealizedPL,
            unrealizedPLPercentage
          };
        } catch (error) {
          console.error(`Error fetching data for ${holding.ticker}:`, error);
          
          // Return a valid Holding object with fallback values
          return {
            ticker: holding.ticker,
            name: holding.ticker,
            buyPrice: holding.averagePrice,
            quantity: holding.quantity,
            lastTradedPrice: holding.averagePrice,
            dailyChange: 0,
            dailyChangePercentage: 0,
            dayRange: 'N/A',
            volume: 0,
            averageBuyPrice: holding.averagePrice,
            unrealizedPL: 0,
            unrealizedPLPercentage: 0
          };
        }
      })
    );

    // Cache the enriched data
    const cacheFilePath = path.join(process.cwd(), 'src/data/holdings.json');
    fs.writeFileSync(cacheFilePath, JSON.stringify(holdings, null, 2));

    res.status(200).json(holdings);
  } catch (error) {
    console.error('Error in stockData API:', error);
    res.status(500).json([]);
  }
}