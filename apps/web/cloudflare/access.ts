import { type JWTVerifyGetKey, createRemoteJWKSet, jwtVerify } from "jose";

// Only public signing keys are cached. No identities, credentials or learner data.
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function verifyPreviewAccess(
  request: Request,
  issuer: string,
  audience: string,
) {
  const url = new URL(issuer);
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".cloudflareaccess.com") ||
    url.origin !== issuer ||
    !audience ||
    audience === "replace-me"
  ) {
    throw new Error("Cloudflare Access is not configured.");
  }
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new Error("Cloudflare Access authentication required.");
  let keys = keySets.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer));
    keySets.set(issuer, keys);
  }
  return verifyAccessClaims(token, issuer, audience, keys);
}

export async function verifyAccessClaims(
  token: string,
  issuer: string,
  audience: string,
  keys: JWTVerifyGetKey,
) {
  const { payload } = await jwtVerify(token, keys, {
    issuer,
    audience,
    algorithms: ["RS256"],
    requiredClaims: ["exp", "iat", "sub"],
  });
  if (!payload.sub) throw new Error("Access subject is required.");
  return payload.sub;
}
