import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

export function parseEncryptionKeyRing(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("DATA_ENCRYPTION_KEYS is required");
  }

  const keyRing = raw.split(",").map((entry) => {
    const separator = entry.indexOf(":");
    const version = entry.slice(0, separator).trim();
    const encodedKey = entry.slice(separator + 1).trim();
    const key = Buffer.from(encodedKey, "base64");

    if (!/^v[1-9][0-9]*$/.test(version) || separator < 1 || key.length !== 32) {
      throw new Error("DATA_ENCRYPTION_KEYS must contain versioned 32-byte base64 keys");
    }

    return { version, key };
  });

  if (new Set(keyRing.map((entry) => entry.version)).size !== keyRing.length) {
    throw new Error("DATA_ENCRYPTION_KEYS contains duplicate versions");
  }

  return keyRing;
}

function additionalData(version) {
  return Buffer.from(`recycle-map:sensitive-data:${version}`, "utf8");
}

export function encryptWithKeyRing(plaintext, keyRing) {
  const activeKey = keyRing[0];
  if (!activeKey) {
    throw new Error("An active encryption key is required");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, activeKey.key, iv);
  cipher.setAAD(additionalData(activeKey.version));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return [
    "enc",
    activeKey.version,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptWithKeyRing(value, keyRing) {
  const parts = value.split(":");
  if (parts.length !== 5 || parts[0] !== "enc") {
    throw new Error("Malformed encrypted value");
  }

  const [, version, encodedIv, encodedTag, encodedCiphertext] = parts;
  const candidate = keyRing.find((entry) => entry.version === version);
  if (!candidate) {
    throw new Error(`Missing encryption key version: ${version}`);
  }

  const iv = Buffer.from(encodedIv, "base64url");
  const tag = Buffer.from(encodedTag, "base64url");
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Malformed encrypted value");
  }

  const decipher = createDecipheriv(ALGORITHM, candidate.key, iv);
  decipher.setAAD(additionalData(version));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
