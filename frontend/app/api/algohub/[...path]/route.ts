import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_BASE = process.env.ALGOHUB_API_BASE_URL?.replace(/\/$/, "");
const API_KEY = process.env.ALGOHUB_KEY;

type RouteContext = {
  params: {
    path?: string[];
  };
};

async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  if (!API_BASE) {
    return Response.json({ detail: "Missing ALGOHUB_API_BASE_URL" }, { status: 500 });
  }

  if (!API_KEY) {
    return Response.json({ detail: "Missing ALGOHUB_KEY" }, { status: 500 });
  }

  const path = context.params.path ?? [];
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
    const body = await upstreamResponse.arrayBuffer();
    const responseHeaders = new Headers();
    const upstreamContentType = upstreamResponse.headers.get("content-type");

    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    }

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
