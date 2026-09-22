// Pruebas de verifyAccessJwt — correr con: node --test worker/
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAccessJwt, clearCertsCache } from './access-auth.js';

const TEAM = 'merolmedia.cloudflareaccess.com';
const AUD = 'aud-de-prueba-123';
const KID = 'kid-1';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

const keyPair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify']
);
const publicJwk = { ...(await crypto.subtle.exportKey('jwk', keyPair.publicKey)), kid: KID, alg: 'RS256', use: 'sig' };

async function sign(payload, { kid = KID, alg = 'RS256', privateKey = keyPair.privateKey } = {}) {
  const head = b64url(JSON.stringify({ alg, kid, typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

const nowSec = () => Math.floor(Date.now() / 1000);
const validPayload = () => ({
  iss: `https://${TEAM}`,
  aud: [AUD],
  email: 'sierralopez721@gmail.com',
  iat: nowSec() - 10,
  exp: nowSec() + 3600,
});

let certsCalls = 0;
const fetchImpl = async (url) => {
  certsCalls++;
  assert.equal(url, `https://${TEAM}/cdn-cgi/access/certs`);
  return new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { 'content-type': 'application/json' } });
};
const opts = () => ({ teamDomain: TEAM, aud: AUD, fetchImpl });

beforeEach(() => {
  clearCertsCache();
  certsCalls = 0;
});

test('acepta un token válido firmado por el team y regresa el email', async () => {
  const payload = await verifyAccessJwt(await sign(validPayload()), opts());
  assert.equal(payload.email, 'sierralopez721@gmail.com');
});

test('rechaza el token falsificado que pasaba con la versión anterior (firma basura)', async () => {
  const head = b64url(JSON.stringify({ alg: 'RS256', kid: KID }));
  const body = b64url(JSON.stringify(validPayload()));
  await assert.rejects(verifyAccessJwt(`${head}.${body}.firmafalsa`, opts()));
});

test('rechaza payload alterado después de firmar', async () => {
  const [h, , s] = (await sign(validPayload())).split('.');
  const altered = b64url(JSON.stringify({ ...validPayload(), email: 'atacante@example.com' }));
  await assert.rejects(verifyAccessJwt(`${h}.${altered}.${s}`, opts()), /signature/i);
});

test('rechaza token firmado con otra llave', async () => {
  const other = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  await assert.rejects(verifyAccessJwt(await sign(validPayload(), { privateKey: other.privateKey }), opts()), /signature/i);
});

test('rechaza audiencia de otra app de Access', async () => {
  await assert.rejects(verifyAccessJwt(await sign({ ...validPayload(), aud: ['otra-app'] }), opts()), /audience/i);
});

test('rechaza emisor distinto al team', async () => {
  await assert.rejects(verifyAccessJwt(await sign({ ...validPayload(), iss: 'https://otro.cloudflareaccess.com' }), opts()), /issuer/i);
});

test('rechaza token expirado', async () => {
  await assert.rejects(verifyAccessJwt(await sign({ ...validPayload(), exp: nowSec() - 5 }), opts()), /expired/i);
});

test('rechaza alg distinto de RS256 (p. ej. none)', async () => {
  const head = b64url(JSON.stringify({ alg: 'none', kid: KID }));
  const body = b64url(JSON.stringify(validPayload()));
  await assert.rejects(verifyAccessJwt(`${head}.${body}.`, opts()), /alg/i);
});

test('rechaza kid desconocido aunque refresque las llaves', async () => {
  await verifyAccessJwt(await sign(validPayload()), opts()); // calienta el caché
  await assert.rejects(verifyAccessJwt(await sign(validPayload(), { kid: 'kid-desconocido' }), opts()), /key/i);
  assert.equal(certsCalls, 2, 'con caché caliente, un kid nuevo debe refrescar las llaves una vez');
});

test('falla cerrado si falta la configuración de Access', async () => {
  const token = await sign(validPayload());
  await assert.rejects(verifyAccessJwt(token, { teamDomain: TEAM, aud: '', fetchImpl }), /not configured/i);
  await assert.rejects(verifyAccessJwt(token, { teamDomain: '', aud: AUD, fetchImpl }), /not configured/i);
});

test('cachea las llaves entre requests', async () => {
  await verifyAccessJwt(await sign(validPayload()), opts());
  await verifyAccessJwt(await sign(validPayload()), opts());
  assert.equal(certsCalls, 1);
});
