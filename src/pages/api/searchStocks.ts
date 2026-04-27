// src/pages/api/searchStocks.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import yahooFinance from '../../lib/yahooFinance';

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

type QuoteLike = {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
};

type SearchQuoteLike = {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
  score?: number;
  typeDisp?: string;
};

type SearchCacheEntry = {
  data: StockData[];
  updatedAt: number;
};

type ExchangeSuffix = '.NS' | '.BO';

const SEARCH_CACHE_TTL_MS = 30_000;
const SEARCH_QUOTES_LIMIT = 12;
const searchCache = new Map<string, SearchCacheEntry>();
const preferredExchangeByTicker = new Map<string, ExchangeSuffix>();

function getPreferredSymbols(ticker: string) {
  const normalizedTicker = ticker.toUpperCase();
  if (normalizedTicker.endsWith('.NS') || normalizedTicker.endsWith('.BO')) {
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

function getCachedSearchResults(query: string) {
  const cached = searchCache.get(query);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.updatedAt > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(query);
    return null;
  }

  return cached.data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return res.status(200).json([]);
  }

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');

  const cachedResults = getCachedSearchResults(normalizedQuery.toUpperCase());
  if (cachedResults) {
    return res.status(200).json(cachedResults);
  }

  try {
    const searchResponse = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(normalizedQuery)}&quotesCount=${SEARCH_QUOTES_LIMIT}&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&enableCb=true&region=IN`
    );

    if (!searchResponse.ok) {
      throw new Error('Failed to fetch search results');
    }

    const searchData = await searchResponse.json();

    const allQuotes: SearchQuoteLike[] = (searchData.quotes || []).filter((quote: SearchQuoteLike) => quote && quote.symbol);
    const uniqueQuotes = Array.from(
      new Map(allQuotes.map((quote: SearchQuoteLike) => [quote.symbol, quote])).values()
    );

    // Filter and sort results
    const filteredStocks = uniqueQuotes
      .filter((quote) => {
        if (!quote || !quote.symbol) return false;

        // Include stocks and ETFs from any exchange
        const validExchanges = ["BSE", "NSE", "NSI"];
        const symbol = quote.symbol.toString();
        const exchange = quote.exchange || '';
        const quoteType = quote.quoteType || '';
        const isValidExchange = validExchanges.includes(exchange) ||
          symbol.endsWith(".NS") ||
          symbol.endsWith(".BO");
        const isValidType = ["EQUITY", "ETF"].includes(quoteType) ||
          quote.typeDisp === "Equity";

        return isValidExchange && isValidType;
      })
      .sort((a, b) => {
        // Prioritize exact matches in symbol or name
        const queryUpper = normalizedQuery.toUpperCase();
        const aExactMatch = a.symbol === queryUpper || a.shortname?.toUpperCase() === queryUpper;
        const bExactMatch = b.symbol === queryUpper || b.shortname?.toUpperCase() === queryUpper;

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        // Then sort by score (relevance)
        return (b.score || 0) - (a.score || 0);
      })
      .slice(0, SEARCH_QUOTES_LIMIT);

    // If no stocks found, return empty array
    if (filteredStocks.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch real-time price data using yahoo-finance2
    const symbols = Array.from(
      new Set(filteredStocks.flatMap((stock) => getPreferredSymbols(stock.symbol)))
    );

    const quotes: QuoteLike[] = await fetchQuotes(symbols);
    const quoteMap = new Map(quotes.map((q: QuoteLike) => [q.symbol.toUpperCase(), q]));

    const fallbackSymbols = filteredStocks.flatMap((stock) => {
      const symbol = stock.symbol.toUpperCase();
      if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
        return [];
      }

      const preferredSuffix = preferredExchangeByTicker.get(symbol);
      if (!preferredSuffix) {
        return [];
      }

      const preferredSymbol = `${symbol}${preferredSuffix}`;
      if (quoteMap.has(preferredSymbol)) {
        return [];
      }

      const fallbackSuffix: ExchangeSuffix = preferredSuffix === '.NS' ? '.BO' : '.NS';
      return [`${symbol}${fallbackSuffix}`];
    });

    const fallbackQuotes: QuoteLike[] = await fetchQuotes(fallbackSymbols);
    fallbackQuotes.forEach((quote: QuoteLike) => {
      quoteMap.set(quote.symbol.toUpperCase(), quote);
    });

    // Merge price data with stock info
    const stocks: StockData[] = filteredStocks.map((stock) => {
      // We need to resolve which symbol we used to fetch the quote
      const stockSymbolUpper = stock.symbol.toUpperCase();
      const quoteData = stockSymbolUpper.endsWith('.NS') || stockSymbolUpper.endsWith('.BO')
        ? quoteMap.get(stockSymbolUpper)
        : quoteMap.get(`${stockSymbolUpper}.NS`) || quoteMap.get(`${stockSymbolUpper}.BO`);

      if (!stockSymbolUpper.endsWith('.NS') && !stockSymbolUpper.endsWith('.BO')) {
        if (quoteMap.has(`${stockSymbolUpper}.NS`)) {
          preferredExchangeByTicker.set(stockSymbolUpper, '.NS');
        } else if (quoteMap.has(`${stockSymbolUpper}.BO`)) {
          preferredExchangeByTicker.set(stockSymbolUpper, '.BO');
        }
      }

      const mappedStock = {
        ...stock,
        regularMarketPrice: Number(quoteData?.regularMarketPrice) || 0,
        regularMarketChange: Number(quoteData?.regularMarketChange) || 0,
        regularMarketChangePercent: Number(quoteData?.regularMarketChangePercent) || 0
      };
      return mappedStock;
    });

    searchCache.set(normalizedQuery.toUpperCase(), {
      data: stocks,
      updatedAt: Date.now(),
    });

    res.status(200).json(stocks);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
}
