/**
 * Cloudflare Worker reverse proxy → Fly app
 * Bypasses corporate filters that block *.fly.dev
 *
 * Deploy: Cloudflare dashboard → Workers → Create → paste → Deploy
 * Or: npx wrangler deploy
 */
const ORIGIN = "https://northstar-okf-rag.fly.dev";

export default {
  async fetch(request, _env, _ctx) {
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, ORIGIN);

    const headers = new Headers(request.headers);
    headers.set("Host", new URL(ORIGIN).host);
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const upstream = await fetch(target, init);
    const outHeaders = new Headers(upstream.headers);
    outHeaders.set("x-proxied-from", "cloudflare-worker");
    outHeaders.delete("content-security-policy");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  },
};
