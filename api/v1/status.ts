/* GET /api/v1/status : état des connecteurs pour les pastilles « Mode simulation » / « Flux live » du front,
   et configuration publique de Supabase (URL et clé anonyme, publiques par nature). */
import { handler, send, type Req, type Res } from '../../lib/http.ts';
import { configured } from '../../lib/supabase.ts';

export default handler(async (_req: Req, res: Res) => {
  const k = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64').length === 32;
  send(res, 200, {
    backend: configured(),
    supabase: configured() ? { url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY } : null,
    connectors: { encryption: k, eia: !!process.env.EIA_API_KEY, ai: !!process.env.ANTHROPIC_API_KEY, stt: !!(process.env.STT_API_BASE && process.env.STT_API_TOKEN), cron: !!process.env.CRON_SECRET },
    time: new Date().toISOString(),
  });
});
