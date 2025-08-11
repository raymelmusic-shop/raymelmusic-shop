const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Produkte – passe "file" später auf deine echte Datei an (mp3/zip)
const PRODUCTS = {
  beat_001: { name: 'Test-Track', priceEUR: 2.00, file: 'assets/tracks/test.txt' },
};

function sumEUR(items) {
  const total = (items || []).reduce((s, i) => {
    const p = PRODUCTS[i.id];
    if (!p) throw new Error(`Unknown product ${i.id}`);
    return s + Number(p.priceEUR);
  }, 0);
  return Number(total.toFixed(2));
}

// ---- PayPal ----
const PP_BASE = process.env.PP_ENV === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

async function ppToken() {
  const auth = Buffer.from(`${process.env.PP_CLIENT_ID}:${process.env.PP_SECRET}`).toString('base64');
  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('paypal token failed');
  return res.json();
}

async function ppCreateOrder(totalEUR, cartIdsCsv) {
  const { access_token } = await ppToken();
  const res = await fetch(`${PP_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'EUR', value: totalEUR.toFixed(2) },
        custom_id: cartIdsCsv.slice(0, 127) // cart-IDs kommagetrennt
      }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data; // enthält .id
}

async function ppCapture(orderId) {
  const { access_token } = await ppToken();
  const res = await fetch(`${PP_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

// ---- Mail (GMX SMTP) ----
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmx.net',
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendMail({ to, subject, text }) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to, subject, text
  });
}

// ---- Download-Token (HMAC) ----
function createDownloadToken(file, expiresInSeconds = 24 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = Buffer.from(JSON.stringify({ file, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.DOWNLOAD_TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyDownloadToken(token) {
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', process.env.DOWNLOAD_TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return data; // { file, exp }
}

function productFilesFromCartIds(cartIds) {
  return cartIds.map(id => {
    const p = PRODUCTS[id];
    if (!p) throw new Error(`Unknown product ${id}`);
    return p.file;
  });
}

function orderEmailText(links) {
  return `Danke für deinen Kauf!

Deine Download-Links (24h gültig):
${links.join('\n')}
`;
}

module.exports = {
  PRODUCTS,
  sumEUR,
  ppCreateOrder,
  ppCapture,
  sendMail,
  createDownloadToken,
  verifyDownloadToken,
  productFilesFromCartIds,
  orderEmailText,
  fs,
  path,
};
