/* Chiffrement des identifiants courtiers : AES-256-GCM, clé ENCRYPTION_KEY (32 octets base64) hors base. */
import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { HttpError } from './http.ts';

function key(): Buffer {
  const k = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64');
  if (k.length !== 32) throw new HttpError(503, 'ENCRYPTION_KEY absente ou invalide (32 octets en base64 attendus)');
  return k;
}
/** Format : v1.<iv base64>.<tag base64>.<données base64> */
export function encrypt(plain: string): string {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}
export function decrypt(blob: string): string {
  const [v, iv, tag, data] = blob.split('.');
  if (v !== 'v1' || !iv || !tag || !data) throw new HttpError(500, 'Identifiants chiffrés illisibles');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}
export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');
export function sameHash(a: string, b: string): boolean { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export const newKey = (): string => randomBytes(24).toString('base64url');
