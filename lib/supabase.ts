/* Clients Supabase côté serveur. La clé service_role ne quitte jamais le serveur. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { HttpError, header, type Req } from './http.js';

let admin: SupabaseClient | null = null;
export function configured(): boolean { return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }
export function db(): SupabaseClient {
  if (!configured()) throw new HttpError(503, 'Backend non configuré : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquants (mode simulation)');
  admin ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return admin;
}
/** Identifie l'utilisateur à partir du jeton Supabase envoyé par le navigateur (Authorization: Bearer <jwt>). */
export async function requireUser(req: Req): Promise<string> {
  const auth = header(req, 'authorization');
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) throw new HttpError(401, 'Session requise');
  const { data, error } = await db().auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, 'Session invalide');
  return data.user.id;
}
/** Identifiant et e-mail de l'utilisateur (pour rattacher les invitations). */
export async function requireUserInfo(req: Req): Promise<{ id: string; email: string }> {
  const auth = header(req, 'authorization');
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) throw new HttpError(401, 'Session requise');
  const { data, error } = await db().auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, 'Session invalide');
  return { id: data.user.id, email: String(data.user.email || '').toLowerCase() };
}
/** Tâches planifiées Vercel : Authorization: Bearer <CRON_SECRET>. */
export function isCron(req: Req): boolean { const s = process.env.CRON_SECRET; return !!s && header(req, 'authorization') === `Bearer ${s}`; }
export function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new HttpError(500, r.error.message);
  return r.data as T;
}
