import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { serialize } from 'cookie';
import { getKiteAccountConfig, kiteAccounts } from '../../../config/kiteAccounts';
import invariant from '../../../utils/invariant';

const APP_URL = process.env.APP_URL;
invariant(APP_URL, 'APP_URL environment variable is required.');

const STATE_COOKIE_NAME = 'kite_oauth_state';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestedAccount = typeof req.query.account === 'string' ? req.query.account : undefined;
  const accountId = requestedAccount || kiteAccounts[0]?.id;

  if (!accountId) {
    return res.status(500).json({ error: 'No Kite accounts configured.' });
  }

  try {
    const account = getKiteAccountConfig(accountId);
    const nonce = randomBytes(24).toString('hex');
    const state = `${account.id}:${nonce}`;

    const cookieValue = serialize(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 300,
    });

    res.setHeader('Set-Cookie', cookieValue);

    const redirectUri = `${APP_URL!.replace(/\/$/, '')}/api/kite/callback`;
    const kiteLoginUrl = new URL('https://kite.zerodha.com/connect/login');
    kiteLoginUrl.searchParams.set('api_key', account.apiKey);
    kiteLoginUrl.searchParams.set('v', '3');
    kiteLoginUrl.searchParams.set('state', state);
    kiteLoginUrl.searchParams.set('redirect_uri', redirectUri);

    return res.redirect(kiteLoginUrl.toString());
  } catch (error) {
    console.error('Failed to start Kite login', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to initiate Kite login',
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
