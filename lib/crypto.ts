import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * Symmetric encryption for user-supplied API keys stored at rest.
 *
 * AES-256-GCM with a server-only key from `APP_ENCRYPTION_KEY` (32 bytes,
 * base64). Ciphertext format: `v1:<base64(iv(12) | authTag(16) | ciphertext)>`.
 * The server decrypts only to call the provider (and inside the cron); the
 * plaintext key is never sent to the browser.
 *
 * Generate a key:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const VERSION = "v1";
const IV_LEN = 12; // GCM standard nonce length
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Generate one with " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" and add it to .env.local.`,
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `APP_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Use a base64-encoded 32-byte key.`,
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, ct]).toString("base64")}`;
}

export function decryptSecret(blob: string): string {
  const key = getKey();
  const [version, payload] = blob.split(":", 2);
  if (version !== VERSION || !payload) {
    throw new Error("Unrecognized ciphertext format for stored secret.");
  }
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
