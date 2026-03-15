const COOKIE_NAME = "algohub_token";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const SIGN_MESSAGE = "algohub-auth";

async function getKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function computeToken(password: string): Promise<string> {
  const key = await getKey(password);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(SIGN_MESSAGE));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyToken(token: string, password: string): Promise<boolean> {
  const key = await getKey(password);
  const sigBytes = new Uint8Array(token.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(SIGN_MESSAGE));
}

export { COOKIE_NAME, MAX_AGE };
