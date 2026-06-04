import type { NextApiRequest, NextApiResponse } from 'next';
import { getPortfolioHoldings } from '../../lib/portfolioSnapshot';
import { Holding } from '../../types/holding';

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Holding[]>
) {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  try {
    res.status(200).json(await getPortfolioHoldings());
  } catch (error) {
    console.error('Error in stockData API:', error);
    res.status(500).json([]);
  }
}
