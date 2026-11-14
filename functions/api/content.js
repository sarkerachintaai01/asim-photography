// সাইটের লেখা/তথ্য (content) সংরক্ষণ ও পড়া — Cloudflare KV (বিনামূল্যে)
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
const ok = (req, env) => env.ADMIN_PASSWORD && req.headers.get('X-Admin') === env.ADMIN_PASSWORD;

export async function onRequestGet({ env }) {
  if (!env.SITE) return J({ error: 'KV not bound' }, 500);
  const v = await env.SITE.get('content');
  if (!v) return J({ error: 'empty' }, 404);
  return new Response(v, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
}
export async function onRequestPut({ request, env }) {
  if (!ok(request, env)) return J({ error: 'unauthorized' }, 401);
  const t = await request.text();
  try { JSON.parse(t); } catch { return J({ error: 'bad json' }, 400); }
  await env.SITE.put('content', t);
  return J({ ok: true });
}
// লগইন যাচাই
export async function onRequestPost({ request, env }) {
  return ok(request, env) ? J({ ok: true }) : J({ error: 'unauthorized' }, 401);
}
