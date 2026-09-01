export interface EncryptionKey {
  version: string;
  key: Buffer;
}

export function parseEncryptionKeyRing(raw: string): EncryptionKey[];
export function encryptWithKeyRing(
  plaintext: string,
  keyRing: EncryptionKey[],
): string;
export function decryptWithKeyRing(
  value: string,
  keyRing: EncryptionKey[],
): string;
