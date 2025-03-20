// src/pages/api/stockData.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import yahooFinance from 'yahoo-finance2';
import { Holding } from '../../types/holding';

// Static holdings data
const HOLDINGS_DATA = [
  { ticker: "ALOKINDS", averagePrice: 28.3, quantity: 15000 },
  { ticker: "BAJAJHFL", averagePrice: 125.13, quantity: 600 },
  { ticker: "BDL", averagePrice: 1525, quantity: 6 },
  { ticker: "BEL", averagePrice: 279.92, quantity: 500 },
  { ticker: "BHEL", averagePrice: 239.33, quantity: 300 },
  { ticker: "BOHRAIND", averagePrice: 24.91, quantity: 19500 },
  { ticker: "COALINDIA", averagePrice: 419.8, quantity: 200 },
  { ticker: "EASEMYTRIP", averagePrice: 18.98, quantity: 13000 },
  { ticker: "ENGINERSIN", averagePrice: 179.08, quantity: 400 },
  { ticker: "EXIDEIND", averagePrice: 345, quantity: 200 },
  { ticker: "GANESHBE", averagePrice: 173.5, quantity: 100 },
  { ticker: "GREENPOWER", averagePrice: 21.84, quantity: 11500 },
  { ticker: "HAL", averagePrice: 2906.25, quantity: 60 },
  { ticker: "HFCL", averagePrice: 117.43, quantity: 600 },
  { ticker: "HSCL", averagePrice: 338.35, quantity: 200 },
  { ticker: "SAMMAANCAP", averagePrice: 142.40, quantity: 600 },
  { ticker: "IDBI", averagePrice: 64.18, quantity: 80 },
  { ticker: "IDEA", averagePrice: 12.68, quantity: 9000 },
  { ticker: "INDUSINDBK", averagePrice: 693.3, quantity: 20 },
  { ticker: "INDUSTOWER", averagePrice: 280, quantity: 200 },
  { ticker: "IREDA", averagePrice: 184.41, quantity: 800 },
  { ticker: "IRFC", averagePrice: 144.5, quantity: 200 },
  { ticker: "ITC", averagePrice: 410, quantity: 100 },
  { ticker: "ITCHOTELS", averagePrice: 553.91, quantity: 10 },
  { ticker: "JIOFIN", averagePrice: 297.65, quantity: 1350 },
  { ticker: "JSWENERGY", averagePrice: 403.72, quantity: 15 },
  { ticker: "MAHABANK", averagePrice: 61.5, quantity: 200 },
  { ticker: "NHPC", averagePrice: 91.08, quantity: 700 },
  { ticker: "OLAELEC", averagePrice: 77.15, quantity: 900 },
  { ticker: "PNB", averagePrice: 106.75, quantity: 400 },
  { ticker: "PRAJIND", averagePrice: 532.86, quantity: 50 },
  { ticker: "RELIANCE", averagePrice: 1149.71, quantity: 275 },
  { ticker: "RELINFRA", averagePrice: 190, quantity: 100 },
  { ticker: "RPOWER", averagePrice: 39.38, quantity: 10000 },
  { ticker: "RVNL", averagePrice: 465.31, quantity: 80 },
  { ticker: "SANGHIIND", averagePrice: 61.48, quantity: 200 },
  { ticker: "SJVN", averagePrice: 112.3, quantity: 800 },
  { ticker: "SUZLON", averagePrice: 45.43, quantity: 10000 },
  { ticker: "SYNCOMF", averagePrice: 21.25, quantity: 4000 },
  { ticker: "TATAMOTORS", averagePrice: 960, quantity: 30 },
  { ticker: "TATAPOWER", averagePrice: 383.67, quantity: 300 },
  { ticker: "TECHERA-ST", averagePrice: 176.22, quantity: 4800 },
  { ticker: "TITAGARH", averagePrice: 1068.36, quantity: 80 },
  { ticker: "VENUSPIPES", averagePrice: 1295.15, quantity: 20 },
  { ticker: "VPRPL", averagePrice: 167.93, quantity: 200 },
  { ticker: "YESBANK", averagePrice: 23.57, quantity: 1250 },
  { ticker: "ZENTEC", averagePrice: 950.4, quantity: 50 },
  { ticker: "ZOMATO", averagePrice: 167.4, quantity: 100 }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Holding[]>
) {
  try {
    // Fetch real-time data for all tickers
    const holdings = await Promise.all(
      HOLDINGS_DATA.map(async (holding): Promise<Holding> => {
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

    res.status(200).json(holdings);
  } catch (error) {
    console.error('Error in stockData API:', error);
    res.status(500).json([]);
  }
}