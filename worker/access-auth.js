// Verificación del JWT de Cloudflare Access.
// Access solo protege /admin/*; la API no pasa por Access, así que el Worker
// no puede confiar en que el token venga de Cloudflare: verifica firma RS256
// contra las llaves públicas del team, audiencia (AUD de la app), emisor y expiración.

const CERTS_TTL_MS = 60 * 60 * 1000;
let certsCache = { url: null, keys: [], fetchedAt: 0 };

export function clearCertsCache() {
  certsCache = { url: null, keys: [], fetchedAt: 0 };
}

export async function verifyAccessJwt(token, { teamDomain, aud, fetchImpl = fetch, now = Date.now() }) {
  if (!teamDomain || !aud) throw new Error('Access not configured');

  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');
  const header = JSON.parse(b64urlToString(parts[0]));
  const payload = JSON.parse(b64urlToString(parts[1]));

  if (header.alg !== 'RS256') throw new Error('Unexpected alg');

  const issuer = `https://${teamDomain}`;
  if (payload.iss !== issuer) throw new Error('Bad issuer');

  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) throw new Error('Bad audience');

  const nowSec = Math.floor(now / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) throw new Error('Token expired');
  if (typeof payload.nbf === 'number' && payload.nbf > nowSec + 60) throw new Error('Token not yet valid');
  if (!payload.email) throw new Error('No email in JWT');

  const jwk = await findKey(header.kid, `${issuer}/cdn-cgi/access/certs`, fetchImpl, now);
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) throw new Error('Bad signature');

  return payload;
}

async function findKey(kid, certsUrl, fetchImpl, now) {
  const fresh = certsCache.url === certsUrl && now - certsCache.fetchedAt < CERTS_TTL_MS;
  let key = fresh ? certsCache.keys.find((k) => k.kid === kid) : null;
  if (key) return key;

  // Llaves vencidas o kid desconocido (Access rota llaves): refrescar una vez
  const res = await fetchImpl(certsUrl);
  if (!res.ok) throw new Error('Could not fetch Access certs');
  const { keys = [] } = await res.json();
  certsCache = { url: certsUrl, keys, fetchedAt: now };

  key = keys.find((k) => k.kid === kid);
  if (!key) throw new Error('Unknown signing key');
  return key;
}

function b64urlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToString(str) {
  return new TextDecoder().decode(b64urlToBytes(str));
}
