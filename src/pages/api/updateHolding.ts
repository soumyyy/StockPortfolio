import type { NextApiRequest, NextApiResponse } from 'next';

// Initialize Edge Config
const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const EDGE_CONFIG_TOKEN = process.env.VERCEL_ACCESS_TOKEN;

if (!EDGE_CONFIG_ID || !EDGE_CONFIG_TOKEN) {
  throw new Error('Edge Config environment variables are not set');
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

    if (!ticker || !quantity || !averagePrice || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (quantity <= 0 || averagePrice <= 0) {
      return res.status(400).json({ error: 'Quantity and average price must be positive' });
    }

    // Fetch current holdings from Edge Config
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`, {
      headers: {
        'Authorization': `Bearer ${EDGE_CONFIG_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch holdings from Edge Config');
    }

    const items = await response.json();
    const holdingsItem = items.find((item: any) => item.key === 'holdings');
    
    if (!holdingsItem) {
      throw new Error('No holdings found in Edge Config');
    }

    const holdingsData = holdingsItem.value;

    if (action === 'add' || action === 'update') {
      // Add or update holding
      holdingsData[ticker] = {
        averagePrice: Number(averagePrice),
        quantity: Number(quantity)
      };
    } else if (action === 'delete') {
      // Delete holding
      delete holdingsData[ticker];
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Update holdings in Edge Config
    const updateResponse = await fetch(`https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${EDGE_CONFIG_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            key: 'holdings',
            value: holdingsData,
            operation: 'upsert'
          }
        ]
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => null);
      const errorMessage = errorData?.error?.message || await updateResponse.text();
      throw new Error(`Failed to update holdings: ${errorMessage}`);
    }

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
