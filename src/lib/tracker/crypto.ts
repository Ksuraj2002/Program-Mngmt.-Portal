import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM. Key is 32 raw bytes, supplied as base64 in HR_COOKIE_ENC_KEY.
// Generate one with:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Ciphertext format (base64 of): [12-byte IV][16-byte auth tag][ciphertext].

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.HR_COOKIE_ENC_KEY;
  if (!raw) {
    throw new Error(
      "HR_COOKIE_ENC_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `HR_COOKIE_ENC_KEY must decode to 32 bytes (got ${key.length}).`
    );
  }
  return key;
}

export function encryptCookie(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptCookie(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, "base64");
  if (buf.length < 12 + 16 + 1) {
    throw new Error("Stored cookie ciphertext is malformed.");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
