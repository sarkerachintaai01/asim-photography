// ছবি আপলোড/দেখানো/মোছা — Cloudflare KV
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
const ok = (req, env) => env.ADMIN_PASSWORD && req.headers.get('X-Admin') === env.ADMIN_PASSWORD;

export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get('id') || '';
  const v = id && (await env.SITE.get('img:' + id));
  if (!v) return new Response('Not found', { status: 404 });
  const m = v.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!m) return new Response('Bad', { status: 500 });
  const bin = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
export async function onRequestPost({ request, env }) {
  if (!ok(request, env)) return J({ error: 'unauthorized' }, 401);
  const { data } = await request.json();
  if (typeof data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(data)) return J({ error: 'bad image' }, 400);
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await env.SITE.put('img:' + id, data);
  return J({ ok: true, url: '/api/img?id=' + id });
}
export async function onRequestDelete({ request, env }) {
  if (!ok(request, env)) return J({ error: 'unauthorized' }, 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (id) await env.SITE.delete('img:' + id);
  return J({ ok: true });
}
