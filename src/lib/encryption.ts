import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';
import invariant from '../utils/invariant';

const rawKey = process.env.TOKEN_ENCRYPTION_KEY;
invariant(
  rawKey && rawKey.length >= 32,
  'TOKEN_ENCRYPTION_KEY must be at least 32 characters long.',
);

const ENCRYPTION_KEY = createHash('sha256').update(rawKey).digest();

const IV_LENGTH = 12; // AES-GCM standard

export function encrypt(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

export function decrypt(payload: string): string {
  const [ivBase64, tagBase64, dataBase64] = payload.split('.');
  invariant(ivBase64 && tagBase64 && dataBase64, 'Invalid encrypted payload.');

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(tagBase64, 'base64');
  const encryptedData = Buffer.from(dataBase64, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
}
