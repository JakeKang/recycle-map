import {
  decryptWithKeyRing,
  encryptWithKeyRing,
  parseEncryptionKeyRing,
} from "@/lib/sensitive-data-core.mjs";

const ENCRYPTED_PREFIX = "enc:";
type EncryptionKey = ReturnType<typeof parseEncryptionKeyRing>[number];

function readKeyRing(): EncryptionKey[] {
  const raw = process.env.DATA_ENCRYPTION_KEYS?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATA_ENCRYPTION_KEYS is required in production");
    }
    return [];
  }

  return parseEncryptionKeyRing(raw);
}

export function encryptSensitiveText(plaintext: string): string {
  const keyRing = readKeyRing();
  if (keyRing.length === 0) {
    return plaintext;
  }
  return encryptWithKeyRing(plaintext, keyRing);
}

export function decryptSensitiveText(value: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  return decryptWithKeyRing(value, readKeyRing());
}
