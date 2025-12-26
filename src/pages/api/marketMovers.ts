// src/pages/api/marketMovers.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import yahooFinance from 'yahoo-finance2';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Replace this sample array with your complete list of Indian stock tickers.
    // For NSE stocks, append ".NS" to each ticker.
    const stocks: string[] = [
      "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
      "SBIN.NS", "BHARTIARTL.NS", "HINDUNILVR.NS", "AXISBANK.NS", "MARUTI.NS",
      "ULTRACEMCO.NS", "ASIANPAINT.NS", "BAJFINANCE.NS", "HCLTECH.NS", "WIPRO.NS",
      "LT.NS", "TATAMOTORS.NS", "TITAN.NS", "POWERGRID.NS", "NTPC.NS"
      // ... add as many as needed
    ];

    // Fetch quotes concurrently for all tickers.
    const quotes = await Promise.all(
      stocks.map(async (symbol) => {
        try {
          return await yahooFinance.quote(symbol);
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed or incomplete responses.
    const validQuotes = quotes.filter(
      (q) =>
        q &&
        typeof q.regularMarketPrice === 'number' &&
        typeof q.regularMarketChangePercent === 'number'
    );

    // Calculate top gainers: filter for positive change, then sort descending.
    const topGainers = validQuotes
      .filter((q) => (q!.regularMarketChangePercent || 0) > 0)
      .sort((a, b) => (b!.regularMarketChangePercent || 0) - (a!.regularMarketChangePercent || 0))
      .slice(0, 10)
      .map((q) => ({
        symbol: q!.symbol?.replace('.NS', ''),
        price: q!.regularMarketPrice,
        change: q!.regularMarketChange,
        changePercent: q!.regularMarketChangePercent,
      }));

    // Calculate top losers: filter for negative change, then sort ascending (most negative first).
    const topLosers = validQuotes
      .filter((q) => (q!.regularMarketChangePercent || 0) < 0)
      .sort((a, b) => (a!.regularMarketChangePercent || 0) - (b!.regularMarketChangePercent || 0))
      .slice(0, 10)
      .map((q) => ({
        symbol: q!.symbol?.replace('.NS', ''),
        price: q!.regularMarketPrice,
        change: q!.regularMarketChange,
        changePercent: q!.regularMarketChangePercent,
      }));

    res.status(200).json({ topGainers, topLosers });
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ message: 'Error fetching market data' });
  }
}