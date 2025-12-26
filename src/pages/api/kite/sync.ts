import type { NextApiRequest, NextApiResponse } from 'next';
import { trySyncAccount } from '../../../lib/kiteSync';
import { KiteAuthRequiredError } from '../../../lib/kite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accountId =
    typeof req.query.account === 'string'
      ? req.query.account
      : typeof req.body?.account === 'string'
        ? req.body.account
        : null;

  if (!accountId) {
    return res.status(400).json({ error: 'Missing account parameter' });
  }

  try {
    const portfolio = await trySyncAccount(accountId);
    return res.status(200).json({
      success: true,
      fetchedAt: portfolio.fetchedAt,
    });
  } catch (error) {
    if (error instanceof KiteAuthRequiredError) {
      return res.status(401).json({
        success: false,
        reauthRequired: true,
        message: error.message,
      });
    }

    const message = error instanceof Error ? error.message : 'Failed to sync portfolio';
    return res.status(500).json({
      success: false,
      message,
    });
  }
}
