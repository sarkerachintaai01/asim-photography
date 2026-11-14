// Asim Photography — Cloudflare Worker (শুধু /api/* এর কাজ করে; বাকি সব ফাইল সরাসরি পরিবেশিত হয়)
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
const ok = (req, env) => env.ADMIN_PASSWORD && req.headers.get('X-Admin') === env.ADMIN_PASSWORD;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = request.method;
    if (url.pathname === '/api/content') {
      if (m === 'GET') {
        if (!env.SITE) return J({ error: 'KV not bound' }, 500);
        const v = await env.SITE.get('content');
        if (!v) return J({ error: 'empty' }, 404);
        return new Response(v, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
      }
      if (m === 'PUT') {
        if (!ok(request, env)) return J({ error: 'unauthorized' }, 401);
        const t = await request.text();
        try { JSON.parse(t); } catch { return J({ error: 'bad json' }, 400); }
        await env.SITE.put('content', t);
        return J({ ok: true });
      }
      if (m === 'POST') return ok(request, env) ? J({ ok: true }) : J({ error: 'unauthorized' }, 401);
    }
    if (url.pathname === '/api/img') {
      if (m === 'GET') {
        const id = url.searchParams.get('id') || '';
        const v = id && (await env.SITE.get('img:' + id));
        if (!v) return new Response('Not found', { status: 404 });
        const mm = v.match(/^data:([^;]+);base64,([\s\S]*)$/);
        if (!mm) return new Response('Bad', { status: 500 });
        const bin = Uint8Array.from(atob(mm[2]), c => c.charCodeAt(0));
        return new Response(bin, { headers: { 'Content-Type': mm[1], 'Cache-Control': 'public, max-age=31536000, immutable' } });
      }
      if (m === 'POST') {
        if (!ok(request, env)) return J({ error: 'unauthorized' }, 401);
        const { data } = await request.json();
        if (typeof data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(data)) return J({ error: 'bad image' }, 400);
        const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        await env.SITE.put('img:' + id, data);
        return J({ ok: true, url: '/api/img?id=' + id });
      }
      if (m === 'DELETE') {
        if (!ok(request, env)) return J({ error: 'unauthorized' }, 401);
        const id = url.searchParams.get('id') || '';
        if (id) await env.SITE.delete('img:' + id);
        return J({ ok: true });
      }
    }
    return env.ASSETS.fetch(request);
  }
};
