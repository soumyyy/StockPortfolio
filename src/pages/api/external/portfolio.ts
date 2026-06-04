import type { NextApiRequest, NextApiResponse } from 'next';
import { getPortfolioSnapshot, PortfolioSnapshot } from '../../../lib/portfolioSnapshot';

type PortfolioApiResponse = PortfolioSnapshot | {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PortfolioApiResponse>
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    return res.status(200).json(await getPortfolioSnapshot());
  } catch (error) {
    console.error('Error in external portfolio API:', error);
    return res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
}
