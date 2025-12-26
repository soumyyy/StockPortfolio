import type { NextApiRequest, NextApiResponse } from 'next';
import { parse, serialize } from 'cookie';
import invariant from '../../../utils/invariant';
import { exchangeRequestToken } from '../../../lib/kite';
import { setStoredAccessToken } from '../../../lib/kiteTokenStore';
import { syncAccountSnapshot } from '../../../lib/kiteSync';

const STATE_COOKIE_NAME = 'kite_oauth_state';
const APP_URL = process.env.APP_URL || 'http://127.0.0.1:3000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { request_token: requestToken, state } = req.query;

  if (!requestToken || typeof requestToken !== 'string') {
    return res.status(400).json({ error: 'Missing request_token from Kite.' });
  }

  const cookies = parse(req.headers.cookie || '');
  const storedState = cookies[STATE_COOKIE_NAME];

  if (!storedState) {
    return res.status(400).json({ error: 'OAuth state cookie missing.' });
  }

  const providedState = typeof state === 'string' ? state : null;

  if (providedState && storedState !== providedState) {
    return res.status(400).json({ error: 'Invalid OAuth state.' });
  }

  const effectiveState = providedState ?? storedState;
  const [accountId] = effectiveState.split(':');
  invariant(accountId, 'Could not determine Kite account from OAuth state.');

  try {
    const accessToken = await exchangeRequestToken(accountId, requestToken);
    await setStoredAccessToken(accountId, accessToken);
    await syncAccountSnapshot(accountId);
  } catch (error) {
    console.error('Failed to store Kite access token', error);
    const message =
      error instanceof Error ? error.message : 'Failed to exchange Kite request token.';
    return respondAndClearCookie(res, { error: message }, 500);
  }

  return respondAndClearCookie(res, null, 302, `${APP_URL.replace(/\/$/, '')}/`);
}

function respondAndClearCookie(
  res: NextApiResponse,
  payload: Record<string, any> | null,
  status = 200,
  redirectUrl?: string,
) {
  res.setHeader(
    'Set-Cookie',
    serialize(STATE_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    }),
  );

  if (redirectUrl) {
    res.writeHead(status, { Location: redirectUrl });
    res.end();
    return;
  }

  res.status(status).json(payload ?? { ok: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
