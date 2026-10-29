#!/usr/bin/env node
/**
 * Apple MapKit JS için imzalı JWT üretir. Bağımlılık yok, yalnızca Node (>=18).
 *
 * Kullanım:
 *   node tools/generate-mapkit-token.mjs \
 *     --key  ~/Downloads/AuthKey_ABC123DEFG.p8 \
 *     --team TEAMID1234 \
 *     --kid  ABC123DEFG \
 *     --origin https://boxingkca.github.io \
 *     --days 180
 *
 * ÖNEMLİ
 *  - .p8 dosyası GİZLİDİR. Asla depoya koyma, kimseye gönderme. (.gitignore zaten engeller.)
 *  - Çıkan JWT ise herkese açık yayınlanmak üzere tasarlanmıştır; "origin" alanı sayesinde
 *    yalnızca belirttiğin alan adında çalışır. config.js içine yapıştırılır.
 */
import { readFileSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";
import { homedir } from "node:os";

function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 ? process.argv[i + 1] : fallback;
}
const need = (v, n) => { if (!v) { console.error(`Eksik parametre: --${n}`); process.exit(1); } return v; };

const keyPath = need(arg("key"), "key").replace(/^~(?=$|\/)/, homedir());
const teamId  = need(arg("team"), "team");
const kid     = need(arg("kid"), "kid");
const origin  = need(arg("origin"), "origin");
const days    = Number(arg("days", "180"));

if (!/^https?:\/\/[^/]+$/.test(origin)) {
  console.error('--origin yalnızca şema + alan adı olmalı, sonunda "/" ya da yol olmadan. Örn: https://boxingkca.github.io');
  process.exit(1);
}
if (!(days > 0 && days <= 365)) { console.error("--days 1 ile 365 arasında olmalı."); process.exit(1); }

const b64url = (b) => Buffer.from(b).toString("base64url");
const now = Math.floor(Date.now() / 1000);

const header  = { alg: "ES256", kid, typ: "JWT" };
const payload = { iss: teamId, iat: now, exp: now + days * 86400, origin };

const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
const key  = createPrivateKey(readFileSync(keyPath));
// JWT ES256 imzası ham r||s biçimindedir (DER değil): ieee-p1363
const sig  = sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" });
const token = `${data}.${b64url(sig)}`;

console.error(`Geçerlilik: ${new Date((now + days * 86400) * 1000).toISOString().slice(0, 10)} tarihine kadar (${days} gün)`);
console.error(`Origin    : ${origin}\n`);
console.log(token);
