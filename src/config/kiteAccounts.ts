import invariant from '../utils/invariant';

export interface KiteAccountConfig {
  id: string;
  label: string;
  apiKey: string;
  apiSecret: string;
  envSuffix: string;
}

const rawIds = process.env.KITE_ACCOUNT_IDS || '';

const parsedIds = rawIds
  .split(',')
  .map((id) => id.trim())
  .filter((id) => id.length > 0);

invariant(
  parsedIds.length > 0,
  'KITE_ACCOUNT_IDS is not configured. Provide a comma separated list such as "self,mom".',
);

const normalizeSuffix = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase();

const buildAccountConfig = (id: string): KiteAccountConfig => {
  const envSuffix = normalizeSuffix(id);
  const apiKey = process.env[`KITE_API_KEY_${envSuffix}`];
  const apiSecret = process.env[`KITE_API_SECRET_${envSuffix}`];
  const label = process.env[`KITE_ACCOUNT_${envSuffix}_LABEL`] || id;

  invariant(apiKey, `Missing KITE_API_KEY_${envSuffix} for Kite account "${id}".`);
  invariant(apiSecret, `Missing KITE_API_SECRET_${envSuffix} for Kite account "${id}".`);

  return {
    id,
    label,
    apiKey,
    apiSecret,
    envSuffix,
  };
};

export const kiteAccounts: KiteAccountConfig[] = parsedIds.map(buildAccountConfig);

export const kiteAccountIds = kiteAccounts.map((account) => account.id);

export function getKiteAccountConfig(accountId: string): KiteAccountConfig {
  const account = kiteAccounts.find((entry) => entry.id === accountId);
  invariant(account, `Unknown Kite account "${accountId}". Known ids: ${parsedIds.join(', ')}`);
  return account;
}

export function getPublicKiteAccounts() {
  return kiteAccounts.map(({ id, label }) => ({ id, label }));
}
