import type { NextApiRequest, NextApiResponse } from 'next';
import {
  fetchEdgeConfigItems,
  readHoldingsFromItems,
  writeHoldingToEdgeConfig,
} from '../../lib/edgeConfigHoldings';

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

    const normalizedTicker = ticker.trim().toUpperCase();
    const parsedQuantity = Number(quantity);
    const parsedAveragePrice = Number(averagePrice);

    if (action !== 'delete') {
      if (!parsedQuantity || !parsedAveragePrice) {
        return res.status(400).json({ error: 'Quantity and average price must be provided for add/update' });
      }

      if (parsedQuantity <= 0 || parsedAveragePrice <= 0) {
        return res.status(400).json({ error: 'Quantity and average price must be positive' });
      }
    }

    const items = await fetchEdgeConfigItems();
    const holdingsData = readHoldingsFromItems(items);
    const existingHolding = holdingsData[normalizedTicker];
    let nextHolding = null;

    if (action === 'add') {
      if (existingHolding) {
        const existingQuantity = Number(existingHolding.quantity) || 0;
        const existingAverage = Number(existingHolding.averagePrice) || 0;
        const totalQuantity = existingQuantity + parsedQuantity;
        const totalValue = (existingQuantity * existingAverage) + (parsedQuantity * parsedAveragePrice);
        const newAverage = totalQuantity === 0 ? 0 : totalValue / totalQuantity;

        nextHolding = {
          averagePrice: Number(newAverage.toFixed(2)),
          quantity: totalQuantity
        };
      } else {
        nextHolding = {
          averagePrice: parsedAveragePrice,
          quantity: parsedQuantity
        };
      }
    } else if (action === 'update') {
      nextHolding = {
        averagePrice: parsedAveragePrice,
        quantity: parsedQuantity
      };
    } else if (action === 'delete') {
      nextHolding = null;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await writeHoldingToEdgeConfig(normalizedTicker, nextHolding);

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
