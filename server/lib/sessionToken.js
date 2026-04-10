// ============================================
// Vapi Session Token (HMAC-SHA256)
// ============================================
// Short-lived signed token used to identify the tenant for a Vapi web call.
// Format: base64url(payload).base64url(signature)
// Payload: { userId, schoolId, exp } (JSON)
// ============================================

import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "../config/env.js";

const DEFAULT_TTL_SECONDS = 60 * 30; // 30 minutes

function base64urlEncode(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function sign(payloadStr) {
  return createHmac("sha256", ENV.vapiSessionSecret).update(payloadStr).digest();
}

export function createSessionToken({ userId, schoolId, ttlSeconds = DEFAULT_TTL_SECONDS }) {
  const payload = {
    userId,
    schoolId: schoolId ?? null,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(payloadStr);
  const sigB64 = base64urlEncode(sign(payloadB64));
  return `${payloadB64}.${sigB64}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  const expectedSig = sign(payloadB64);
  let providedSig;
  try {
    providedSig = base64urlDecode(sigB64);
  } catch {
    return null;
  }

  if (providedSig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(providedSig, expectedSig)) return null;

  let payload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}
