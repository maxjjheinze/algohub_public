import { NextRequest } from "next/server";
import { transformResponse } from "@/lib/scaler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_BASE = process.env.ALGOHUB_API_BASE_URL?.replace(/\/$/, "");
const API_KEY = process.env.ALGOHUB_KEY;

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

async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  if (!API_BASE) {
    return Response.json({ detail: "Missing ALGOHUB_API_BASE_URL" }, { status: 500 });
  }

  if (!API_KEY) {
    return Response.json({ detail: "Missing ALGOHUB_KEY" }, { status: 500 });
  }

  const path = context.params.path ?? [];

  // Unique view tracking: skip increment for bots or repeat visitors
  if (path.join("/") === "views/increment") {
    const alreadyCounted = request.cookies.get(VIEW_COOKIE)?.value === "1";

    if (alreadyCounted || isBot(request)) {
      const viewsUrl = `${API_BASE}/views?source=public`;
      const res = await fetch(viewsUrl, {
        headers: { "X-ALGOHUB-KEY": API_KEY },
        cache: "no-store",
      });
      const json = await res.json();
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

    const body = await upstreamResponse.arrayBuffer();
    return new Response(body, {
      status: upstreamResponse.status,
      headers: responseHeaders
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown proxy error";
    return Response.json({ detail }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, context);
}
