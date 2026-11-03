/* Espaces partagés : rôles, empreinte canonique et signature des versions. */
import { createHash, createHmac } from 'node:crypto';
import { db, check } from './supabase.ts';
import { HttpError } from './http.ts';

export type Role = 'admin' | 'analyste' | 'valideur' | 'lecteur';
export const ROLES: Role[] = ['admin', 'analyste', 'valideur', 'lecteur'];

/** JSON canonique : clés triées récursivement, pour qu'une même version produise toujours la même empreinte. */
export function canon(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const o = v as Record<string, unknown>;
  return '{' + Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}';
}
export const contentHash = (data: unknown): string => createHash('sha256').update(canon(data)).digest('hex');
/** Signature serveur : HMAC-SHA256 avec SIGNING_KEY, sur empreinte | valideur | date. Non falsifiable sans la clé du serveur. */
export function sign(hash: string, validator: string, at: string): string {
  const k = process.env.SIGNING_KEY; if (!k || k.length < 32) throw new HttpError(503, 'SIGNING_KEY absente ou trop courte (32 caractères minimum)');
  return createHmac('sha256', k).update(`${hash}|${validator}|${at}`).digest('hex');
}
export async function roleOf(ws: string, uid: string): Promise<Role | null> {
  const r = check(await db().from('workspace_members').select('role').eq('workspace_id', ws).eq('user_id', uid).maybeSingle()) as { role: Role } | null;
  return r ? r.role : null;
}
export async function requireRole(ws: string, uid: string, allowed: Role[]): Promise<Role> {
  const r = await roleOf(ws, uid);
  if (!r) throw new HttpError(403, 'Vous n\'êtes pas membre de cet espace');
  if (!allowed.includes(r)) throw new HttpError(403, `Rôle « ${r} » insuffisant (requis : ${allowed.join(' ou ')})`);
  return r;
}
export async function audit(e: { workspace_id: string | null; user_id: string; module?: string; path: string; old_value?: unknown; new_value?: unknown; mode: string; version_id?: string }) {
  check(await db().from('audit_events').insert(e));
}
