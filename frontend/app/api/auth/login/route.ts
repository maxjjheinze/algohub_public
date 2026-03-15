import { NextRequest, NextResponse } from "next/server";
import { computeToken, COOKIE_NAME, MAX_AGE } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.AUTH_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await computeToken(password);
  const res = NextResponse.json({ ok: true });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });

  return res;
}
