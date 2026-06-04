import YahooFinance from './yahooFinance';
import { fetchEdgeConfigItems, readHoldingsFromItems } from './edgeConfigHoldings';
import { Holding } from '../types/holding';

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

export interface PortfolioSnapshotHolding extends Holding {
  investedValue: number;
  currentValue: number;
  dailyPL: number;
}

export interface PortfolioSnapshot {
  version: 1;
  generatedAt: string;
  currency: 'INR';
  summary: {
    holdingsCount: number;
    totalQuantity: number;
    totalInvested: number;
    currentValue: number;
    dailyPL: number;
    dailyPLPercentage: number;
    overallPL: number;
    overallPLPercentage: number;
  };
  holdings: PortfolioSnapshotHolding[];
}

const yahooFinance = YahooFinance;
const preferredExchangeByTicker = new Map<string, ExchangeSuffix>();

function roundToTwo(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

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

function hasUsablePrice(quote?: QuoteLike) {
  const price = Number(quote?.regularMarketPrice);
  return Number.isFinite(price) && price > 0;
}

function getBestQuote(symbols: string[], quoteMap: Map<string, QuoteLike>) {
  const quotes = symbols.map((symbol) => quoteMap.get(symbol.toUpperCase())).filter(Boolean) as QuoteLike[];
  return quotes.find(hasUsablePrice) || quotes[0];
}

export async function getPortfolioHoldings(): Promise<Holding[]> {
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

  return Object.entries(holdingsData).map(([ticker, data]): Holding => {
    const tickerUpper = ticker.toUpperCase();
    const candidateSymbols = ticker.includes('.')
      ? [tickerUpper]
      : [`${tickerUpper}.NS`, `${tickerUpper}.BO`];
    const quote = getBestQuote(candidateSymbols, quoteMap);

    if (!ticker.includes('.')) {
      if (hasUsablePrice(quoteMap.get(`${tickerUpper}.NS`))) {
        preferredExchangeByTicker.set(tickerUpper, '.NS');
      } else if (hasUsablePrice(quoteMap.get(`${tickerUpper}.BO`))) {
        preferredExchangeByTicker.set(tickerUpper, '.BO');
      }
    }

    if (!quote) {
      return {
        ticker,
        name: ticker,
        buyPrice: roundToTwo(data.averagePrice),
        quantity: roundToTwo(data.quantity),
        lastTradedPrice: roundToTwo(data.averagePrice),
        dailyChange: 0,
        dailyChangePercentage: 0,
        dayRange: 'N/A',
        volume: 0,
        averageBuyPrice: roundToTwo(data.averagePrice),
        unrealizedPL: 0,
        unrealizedPLPercentage: 0,
      };
    }

    const lastTradedPrice = quote.regularMarketPrice ?? data.averagePrice;
    const dailyChange = quote.regularMarketChange ?? 0;
    const dailyChangePercentage = quote.regularMarketChangePercent ?? 0;
    const unrealizedPL = (lastTradedPrice - data.averagePrice) * data.quantity;
    const unrealizedPLPercentage = ((lastTradedPrice - data.averagePrice) / data.averagePrice) * 100;

    return {
      ticker,
      name: quote.longName || quote.shortName || ticker,
      buyPrice: roundToTwo(data.averagePrice),
      quantity: roundToTwo(data.quantity),
      lastTradedPrice: roundToTwo(lastTradedPrice),
      dailyChange: roundToTwo(dailyChange),
      dailyChangePercentage: roundToTwo(dailyChangePercentage),
      dayRange: `${quote.regularMarketDayLow?.toFixed(2) || 'N/A'}-${quote.regularMarketDayHigh?.toFixed(2) || 'N/A'}`,
      volume: quote.regularMarketVolume || 0,
      averageBuyPrice: roundToTwo(data.averagePrice),
      unrealizedPL: roundToTwo(unrealizedPL),
      unrealizedPLPercentage: roundToTwo(unrealizedPLPercentage),
    };
  });
}

export function createPortfolioSnapshot(holdings: Holding[]): PortfolioSnapshot {
  const snapshotHoldings = holdings.map((holding) => {
    const investedValue = holding.averageBuyPrice * holding.quantity;
    const currentValue = holding.lastTradedPrice * holding.quantity;
    const dailyPL = currentValue * holding.dailyChangePercentage / 100;

    return {
      ...holding,
      investedValue: roundToTwo(investedValue),
      currentValue: roundToTwo(currentValue),
      dailyPL: roundToTwo(dailyPL),
    };
  });

  const totalQuantity = snapshotHoldings.reduce((sum, holding) => sum + holding.quantity, 0);
  const totalInvested = snapshotHoldings.reduce((sum, holding) => sum + holding.investedValue, 0);
  const currentValue = snapshotHoldings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const dailyPL = snapshotHoldings.reduce((sum, holding) => sum + holding.dailyPL, 0);
  const overallPL = currentValue - totalInvested;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    currency: 'INR',
    summary: {
      holdingsCount: snapshotHoldings.length,
      totalQuantity: roundToTwo(totalQuantity),
      totalInvested: roundToTwo(totalInvested),
      currentValue: roundToTwo(currentValue),
      dailyPL: roundToTwo(dailyPL),
      dailyPLPercentage: roundToTwo(currentValue > 0 ? dailyPL / currentValue * 100 : 0),
      overallPL: roundToTwo(overallPL),
      overallPLPercentage: roundToTwo(totalInvested > 0 ? overallPL / totalInvested * 100 : 0),
    },
    holdings: snapshotHoldings,
  };
}

export async function getPortfolioSnapshot() {
  return createPortfolioSnapshot(await getPortfolioHoldings());
}
