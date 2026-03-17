import { NextRequest } from "next/server";
import { transformResponse } from "@/lib/scaler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_BASE = process.env.ALGOHUB_API_BASE_URL?.replace(/\/$/, "");
const API_KEY = process.env.ALGOHUB_KEY;
const ADMIN_SECRET = process.env.ALGOHUB_ADMIN_SECRET;
const VIEW_BASELINE = parseInt(process.env.ALGOHUB_VIEW_BASELINE ?? "0", 10);

type RouteContext = {
  params: {
    path?: string[];
  };
};

const VIEW_COOKIE = "algohub_viewed";
const VIEW_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

const BOT_PATTERN = /bot|crawl|spider|slurp|vercel|preview|lighthouse|pingdom|uptimerobot|headless|phantom|selenium/i;

function isBot(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return BOT_PATTERN.test(ua) || !ua;
}

function isAdmin(request: NextRequest): boolean {
  return !!ADMIN_SECRET && request.cookies.get("algohub_admin")?.value === ADMIN_SECRET;
}

/** Only these first path segments are forwarded to the upstream API. */
const ALLOWED_PATHS = new Set(["accounts", "cleaned", "stats", "raw", "views", "health", "bundle"]);

async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  if (!API_BASE) {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }

  if (!API_KEY) {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }

  const path = context.params.path ?? [];

  // Block any path not in the allowlist (prevents access to /docs, /openapi.json, /admin, etc.)
  if (path.length === 0 || !ALLOWED_PATHS.has(path[0])) {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }

  // Unique view tracking: skip increment for bots or repeat visitors
  if (path.join("/") === "views/increment") {
    const alreadyCounted = request.cookies.get(VIEW_COOKIE)?.value === "1";

    if (alreadyCounted || isBot(request) || isAdmin(request)) {
      const viewsUrl = `${API_BASE}/views?source=public`;
      const res = await fetch(viewsUrl, {
        headers: { "X-ALGOHUB-KEY": API_KEY },
        cache: "no-store",
      });
      const json = await res.json();
      json.total_views = Math.max(0, (json.total_views ?? 0) - VIEW_BASELINE);
      return Response.json(json, { status: res.status });
    }

    // First visit: increment public counter and set cookie
    const incrementUrl = `${API_BASE}/views/increment?source=public`;
    const res = await fetch(incrementUrl, {
      method: "POST",
      headers: { "X-ALGOHUB-KEY": API_KEY },
      cache: "no-store",
    });
    const json = await res.json();
    json.total_views = Math.max(0, (json.total_views ?? 0) - VIEW_BASELINE);
    const response = Response.json(json, { status: res.status });
    response.headers.set(
      "Set-Cookie",
      `${VIEW_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${VIEW_COOKIE_MAX_AGE}`
    );
    return response;
  }

  // Views GET also uses public counter
  if (path.join("/") === "views" && request.method === "GET") {
    const viewsUrl = `${API_BASE}/views?source=public`;
    const res = await fetch(viewsUrl, {
      headers: { "X-ALGOHUB-KEY": API_KEY },
      cache: "no-store",
    });
    const json = await res.json();
    json.total_views = Math.max(0, (json.total_views ?? 0) - VIEW_BASELINE);
    return Response.json(json, { status: res.status });
  }

  const upstreamUrl = `${API_BASE}/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (accept) {
    headers.set("accept", accept);
  }
  headers.set("X-ALGOHUB-KEY", API_KEY);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store"
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, init);
    const upstreamContentType = upstreamResponse.headers.get("content-type") ?? "";
    const responseHeaders = new Headers();

    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    }

    // Intercept JSON responses to apply scaling transformations
    if (upstreamContentType.includes("application/json")) {
      const json = await upstreamResponse.json();
      const transformed = transformResponse(path[0], json);
      return Response.json(transformed, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // Block non-JSON responses to prevent leaking upstream HTML/docs
    return Response.json({ detail: "Not found" }, { status: 404 });
  } catch {
    return Response.json({ detail: "Service unavailable" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, context);
}

