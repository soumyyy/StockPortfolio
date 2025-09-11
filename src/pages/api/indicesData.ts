import { NextApiRequest, NextApiResponse } from 'next';
import yahooFinance from 'yahoo-finance2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set cache headers
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const quotes = await yahooFinance.quote(['^BSESN', '^NSEI']);
    if (!quotes || !Array.isArray(quotes)) {
      throw new Error('Invalid indices data format');
    }
    
    const formattedData = quotes.map(quote => ({
      value: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
    }));
    
    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error fetching indices data:', error);
    res.status(500).json({ error: 'Failed to fetch indices data' });
  }
}