// Server-only: talks to the Quran Foundation Content API (api.quran.com v4)
// using OAuth2 client-credentials. Never import this from a client component —
// it reads QURAN_CLIENT_ID/QURAN_CLIENT_SECRET, which must stay server-side.

const TOKEN_URL = "https://oauth2.quran.foundation/oauth2/token";
const BASE_URL = "https://apis.quran.foundation/content/api/v4";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function requiredEnv(name: "QURAN_CLIENT_ID" | "QURAN_CLIENT_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} env var`);
  return value;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const clientId = requiredEnv("QURAN_CLIENT_ID");
  const clientSecret = requiredEnv("QURAN_CLIENT_SECRET");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=content",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Quran API auth failed (${res.status})`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a bit before actual expiry to avoid racing a stale token.
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.accessToken;
}

export async function quranFetch<T>(
  path: string,
  searchParams: Record<string, string | number | undefined> = {},
  revalidate = 3600
): Promise<T> {
  const clientId = requiredEnv("QURAN_CLIENT_ID");
  const accessToken = await getAccessToken();

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: {
      "x-auth-token": accessToken,
      "x-client-id": clientId,
    },
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`Quran API request failed (${res.status}): ${path}`);
  }

  return res.json() as Promise<T>;
}
