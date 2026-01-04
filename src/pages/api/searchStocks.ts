// src/pages/api/searchStocks.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import YahooFinance from 'yahoo-finance2';
// import type { Quote } from 'yahoo-finance2'; // Removed to fix build
interface Quote {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  [key: string]: any;
}

const yahooFinance = new YahooFinance();

interface StockData {
  // Search result fields
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
  score?: number;
  typeDisp?: string;

  // Price data fields
  regularMarketPrice: number | null;
  regularMarketChange: number | null;
  regularMarketChangePercent: number | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    // Make both exact and fuzzy requests in parallel
    const [exactRes, fuzzyRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&enableCb=true&region=IN`),
      fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=20&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&enableCb=true&region=IN`)
    ]);

    if (!exactRes.ok || !fuzzyRes.ok) {
      throw new Error('Failed to fetch search results');
    }

    const [exactData, fuzzyData] = await Promise.all([exactRes.json(), fuzzyRes.json()]);
    console.log('Search results:', {
      exactResults: exactData.quotes?.length || 0,
      fuzzyResults: fuzzyData.quotes?.length || 0
    });

    // Combine and deduplicate results
    const allQuotes = [
      ...(exactData.quotes || []),
      ...(fuzzyData.quotes || [])
    ].filter(quote => quote && quote.symbol);

    // Remove duplicates based on symbol
    const uniqueQuotes = Array.from(
      new Map(allQuotes.map(quote => [quote.symbol, quote])).values()
    );
    console.log('Unique quotes:', uniqueQuotes.length);

    // Filter and sort results
    const filteredStocks = uniqueQuotes
      .filter((quote) => {
        if (!quote || !quote.symbol) return false;

        // Include stocks and ETFs from any exchange
        const validExchanges = ["BSE", "NSE", "NSI"];
        const symbol = quote.symbol.toString();
        const isValidExchange = validExchanges.includes(quote.exchange) ||
          symbol.endsWith(".NS") ||
          symbol.endsWith(".BO");
        const isValidType = ["EQUITY", "ETF"].includes(quote.quoteType) ||
          quote.typeDisp === "Equity";

        return isValidExchange && isValidType;
      })
      .sort((a, b) => {
        // Prioritize exact matches in symbol or name
        const queryUpper = query.toUpperCase();
        const aExactMatch = a.symbol === queryUpper || a.shortname?.toUpperCase() === queryUpper;
        const bExactMatch = b.symbol === queryUpper || b.shortname?.toUpperCase() === queryUpper;

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        // Then sort by score (relevance)
        return (b.score || 0) - (a.score || 0);
      })
      .slice(0, 20);

    console.log('Filtered stocks:', {
      count: filteredStocks.length,
      symbols: filteredStocks.map(s => s.symbol)
    });

    // If no stocks found, return empty array
    if (filteredStocks.length === 0) {
      return res.status(200).json([]);
    }

    try {
      // Fetch real-time price data using yahoo-finance2
      const symbols = filteredStocks.map(stock => {
        const symbol = stock.symbol;
        if (!symbol.endsWith('.NS') && !symbol.endsWith('.BO')) {
          return `${symbol}.NS`;
        }
        return symbol;
      });

      console.log('Fetching prices for:', symbols);

      // Get quotes for all symbols in parallel
      const quotePromises = symbols.map(async (symbol) => {
        try {
          const result = await yahooFinance.quote(symbol);
          return result as unknown as Quote;
        } catch (error) {
          console.error(`Error fetching quote for ${symbol}:`, error);
          return null;
        }
      });

      const quotes = await Promise.all(quotePromises);

      console.log('Raw quotes:', quotes.map(q => ({
        price: (q as Quote | null)?.regularMarketPrice,
        change: (q as Quote | null)?.regularMarketChange,
        changePercent: (q as Quote | null)?.regularMarketChangePercent
      })));

      // Merge price data with stock info
      const stocks: StockData[] = filteredStocks.map((stock, index) => {
        const quoteData = quotes[index] as Quote | null;
        const mappedStock = {
          ...stock,
          regularMarketPrice: Number(quoteData?.regularMarketPrice) || 0,
          regularMarketChange: Number(quoteData?.regularMarketChange) || 0,
          regularMarketChangePercent: Number(quoteData?.regularMarketChangePercent) || 0
        };
        console.log('Mapped stock:', {
          symbol: mappedStock.symbol,
          price: mappedStock.regularMarketPrice,
          change: mappedStock.regularMarketChange,
          changePercent: mappedStock.regularMarketChangePercent
        });
        return mappedStock;
      });

      console.log('Final stock data:', stocks.map(s => ({
        symbol: s.symbol,
        price: s.regularMarketPrice,
        change: s.regularMarketChange
      })));

      res.status(200).json(stocks);
    } catch (priceError) {
      console.error('Price fetch error:', priceError);
      res.status(200).json(filteredStocks);
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
}