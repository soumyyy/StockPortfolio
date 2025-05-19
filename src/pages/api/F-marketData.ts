// src/pages/api/F-marketData.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import yahooFinance from 'yahoo-finance2';

interface MarketData {
  globalIndices: MarketIndex[];
  crypto: MarketIndex[];
}

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

const GLOBAL_INDICES = [ 
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: 'YM=F', name: 'Dow Futures' },  // Dow Jones Futures
  { symbol: 'INR=X', name: 'USD/INR' },    // USD/INR exchange rate
  { symbol: '^N225', name: 'Nikkei 225' },
  { symbol: '^FTSE', name: 'FTSE 100' },
  { symbol: '^GSPC', name: 'S&P 500' }
];

const CRYPTO_SYMBOLS = [
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'XRP-USD', name: 'XRP' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'SOL-USD', name: 'Solana' }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarketData>
) {
  try {
    // Fetch global indices data
    const indicesData = await Promise.all(
      GLOBAL_INDICES.map(async (index) => {
        try {
          const quote = await yahooFinance.quote(index.symbol);
          return {
            symbol: index.symbol,
            name: index.name,
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            currency: quote.currency || (index.symbol === 'IN=F' ? 'INR' : 'USD')
          };
        } catch (error) {
          console.error(`Error fetching ${index.name}:`, error);
          return {
            symbol: index.symbol,
            name: index.name,
            price: 0,
            change: 0,
            changePercent: 0,
            currency: index.symbol === 'IN=F' ? 'INR' : 'USD'
          };
        }
      })
    );

    // Fetch crypto data
    const cryptoData = await Promise.all(
      CRYPTO_SYMBOLS.map(async (crypto) => {
        try {
          const quote = await yahooFinance.quote(crypto.symbol);
          return {
            symbol: crypto.symbol,
            name: crypto.name,
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            currency: 'USD'
          };
        } catch (error) {
          console.error(`Error fetching ${crypto.name}:`, error);
          return {
            symbol: crypto.symbol,
            name: crypto.name,
            price: 0,
            change: 0,
            changePercent: 0,
            currency: 'USD'
          };
        }
      })
    );

    const marketData: MarketData = {
      globalIndices: indicesData,
      crypto: cryptoData
    };

    // Cache the response for 5 minutes (300 seconds)
    res.setHeader('Cache-Control', 's-maxage=300');
    res.status(200).json(marketData);
  } catch (error) {
    console.error('Error in marketData API:', error);
    res.status(500).json({
      globalIndices: [],
      crypto: []
    });
  }
}