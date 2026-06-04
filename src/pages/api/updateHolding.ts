import type { NextApiRequest, NextApiResponse } from 'next';
import {
  fetchEdgeConfigItems,
  readHoldingsFromItems,
  writeHoldingsToEdgeConfig,
} from '../../lib/edgeConfigHoldings';

function normalizeTickerInput(ticker: string) {
  return ticker.trim().toUpperCase().replace(/\.BS$/, '.BO');
}

function getTickerRoot(ticker: string) {
  return ticker.replace(/\.(NS|BO)$/, '');
}

function resolveStoredTicker(holdingsData: Record<string, unknown>, ticker: string) {
  if (holdingsData[ticker]) {
    return ticker;
  }

  const tickerRoot = getTickerRoot(ticker);
  return Object.keys(holdingsData).find((storedTicker) => getTickerRoot(storedTicker) === tickerRoot) || ticker;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticker, quantity, averagePrice, action } = req.body;

    if (!ticker || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedTicker = normalizeTickerInput(ticker);
    const parsedQuantity = Number(quantity);
    const parsedAveragePrice = Number(averagePrice);

    if (action !== 'delete' && !Number.isFinite(parsedQuantity)) {
      return res.status(400).json({ error: 'Quantity must be a number' });
    }

    const items = await fetchEdgeConfigItems();
    const holdingsData = readHoldingsFromItems(items);
    const storedTicker = resolveStoredTicker(holdingsData, normalizedTicker);
    const existingHolding = holdingsData[storedTicker];
    let nextHolding = null;

    if (action === 'add') {
      if (parsedQuantity === 0) {
        return res.status(400).json({ error: 'Quantity must be a non-zero number' });
      }

      if (existingHolding) {
        const existingQuantity = Number(existingHolding.quantity) || 0;
        const existingAverage = Number(existingHolding.averagePrice) || 0;
        const totalQuantity = existingQuantity + parsedQuantity;

        if (totalQuantity < 0) {
          return res.status(400).json({ error: 'Quantity cannot go below zero' });
        }

        if (totalQuantity === 0) {
          nextHolding = null;
        } else if (parsedQuantity > 0) {
          if (!Number.isFinite(parsedAveragePrice) || parsedAveragePrice <= 0) {
            return res.status(400).json({ error: 'Average price must be positive for a buy lot' });
          }

          const totalValue = (existingQuantity * existingAverage) + (parsedQuantity * parsedAveragePrice);
          const newAverage = totalValue / totalQuantity;

          nextHolding = {
            averagePrice: Number(newAverage.toFixed(2)),
            quantity: totalQuantity
          };
        } else {
          nextHolding = {
            averagePrice: existingAverage,
            quantity: totalQuantity
          };
        }
      } else {
        if (parsedQuantity <= 0) {
          return res.status(400).json({ error: 'Cannot sell a stock that is not in holdings' });
        }

        if (!Number.isFinite(parsedAveragePrice) || parsedAveragePrice <= 0) {
          return res.status(400).json({ error: 'Average price must be positive for a new holding' });
        }

        nextHolding = {
          averagePrice: Number(parsedAveragePrice.toFixed(2)),
          quantity: parsedQuantity
        };
      }
    } else if (action === 'update') {
      if (parsedQuantity === 0) {
        nextHolding = null;
      } else if (!Number.isFinite(parsedAveragePrice) || parsedQuantity < 0 || parsedAveragePrice <= 0) {
        return res.status(400).json({ error: 'Quantity and average price must be positive for update' });
      } else {
        nextHolding = {
          averagePrice: Number(parsedAveragePrice.toFixed(2)),
          quantity: parsedQuantity
        };
      }
    } else if (action === 'delete') {
      nextHolding = null;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (nextHolding) {
      holdingsData[storedTicker] = nextHolding;
    } else {
      delete holdingsData[storedTicker];
    }

    await writeHoldingsToEdgeConfig(holdingsData, items);

    res.status(200).json({ 
      success: true, 
      message: action === 'delete' ? 'Holding deleted successfully' : 'Holding updated successfully' 
    });

  } catch (error) {
    console.error('Error updating holding:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update holding' 
    });
  }
}
