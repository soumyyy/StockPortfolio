import { decrypt, encrypt } from './encryption';
import { getEdgeConfigValue, upsertEdgeConfigValue } from './edgeConfig';

const EDGE_CONFIG_TOKEN_KEY = 'kite_tokens';

type StoredTokenMap = Record<
  string,
  {
    token: string;
    updatedAt: string;
  }
>;

async function readTokenMap(): Promise<StoredTokenMap> {
  const value = await getEdgeConfigValue<StoredTokenMap>(EDGE_CONFIG_TOKEN_KEY);
  return value ?? {};
}

export async function getStoredAccessToken(accountId: string): Promise<string | null> {
  const map = await readTokenMap();
  const payload = map[accountId];
  if (!payload?.token) {
    return null;
  }

  try {
    return decrypt(payload.token);
  } catch (error) {
    console.error(`Failed to decrypt Kite token for account ${accountId}`, error);
    return null;
  }
}

export async function setStoredAccessToken(accountId: string, rawToken: string): Promise<void> {
  const map = await readTokenMap();
  map[accountId] = {
    token: encrypt(rawToken),
    updatedAt: new Date().toISOString(),
  };

  await upsertEdgeConfigValue(EDGE_CONFIG_TOKEN_KEY, map);
}
