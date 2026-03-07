/**
 * MovieX · Proxy de la API de TMDB (Cloudflare Worker)
 *
 * La web (GitHub Pages) llama a este Worker en lugar de llamar a TMDB directamente.
 * El Worker añade la clave, que está guardada como secret (TMDB_API_KEY) en Cloudflare,
 * así que la clave no aparece ni en el código de GitHub ni en el navegador.
 *
 * Medidas de seguridad:
 *  - Solo responde a la web de MovieX (y a localhost para desarrollo).
 *  - Solo permite las 5 consultas que usa MovieX (lista blanca de rutas).
 *  - Solo reenvía los parámetros necesarios y limita su longitud.
 *  - Los errores no muestran detalles internos.
 */

const ALLOWED_ORIGINS = ["https://andreuet23.github.io"];
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const ALLOWED_ROUTES = [
  /^trending\/all\/week$/,
  /^search\/movie$/,
  /^movie\/\d+$/,
  /^movie\/\d+\/videos$/,
  /^movie\/\d+\/watch\/providers$/,
];

const ALLOWED_PARAMS = ["query", "page", "language"];

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const originOk = ALLOWED_ORIGINS.includes(origin) || LOCALHOST.test(origin);
    const cors = originOk ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...cors, "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" },
      });
    }
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, cors);
    if (!originOk) return json({ error: "Forbidden" }, 403);
    if (!env.TMDB_API_KEY) return json({ error: "Server misconfigured" }, 500, cors);

    const url = new URL(request.url);
    const path = url.searchParams.get("path") || "";
    if (!ALLOWED_ROUTES.some((route) => route.test(path))) {
      return json({ error: "Not found" }, 404, cors);
    }

    const upstream = new URL(`https://api.themoviedb.org/3/${path}`);
    for (const name of ALLOWED_PARAMS) {
      const value = url.searchParams.get(name);
      if (value) upstream.searchParams.set(name, value.slice(0, 100));
    }
    upstream.searchParams.set("api_key", env.TMDB_API_KEY);

    try {
      const resp = await fetch(upstream.toString(), { headers: { Accept: "application/json" } });
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": resp.ok ? "public, max-age=3600" : "no-store",
          ...cors,
        },
      });
    } catch {
      return json({ error: "Upstream error" }, 502, cors);
    }
  },
};
