import { afterEach, describe, expect, it, vi } from "vitest";

import {
  decryptSensitiveText,
  encryptSensitiveText,
} from "@/lib/sensitive-data";

const KEY_V1 = Buffer.alloc(32, 1).toString("base64");
const KEY_V2 = Buffer.alloc(32, 2).toString("base64");

describe("sensitive data encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts sensitive text with authenticated encryption", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEYS", `v1:${KEY_V1}`);

    const encrypted = encryptSensitiveText("private report reason");

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain("private report reason");
    expect(decryptSensitiveText(encrypted)).toBe("private report reason");
  });

  it("decrypts old key versions after the active key rotates", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEYS", `v1:${KEY_V1}`);
    const encryptedWithV1 = encryptSensitiveText("rotation-safe");

    vi.stubEnv("DATA_ENCRYPTION_KEYS", `v2:${KEY_V2},v1:${KEY_V1}`);

    expect(decryptSensitiveText(encryptedWithV1)).toBe("rotation-safe");
    expect(encryptSensitiveText("new-value")).toMatch(/^enc:v2:/);
  });

  it("rejects tampered ciphertext and reads legacy plaintext", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEYS", `v1:${KEY_V1}`);
    const encrypted = encryptSensitiveText("tamper-evident");
    const tampered = `${encrypted.slice(0, -2)}aa`;

    expect(() => decryptSensitiveText(tampered)).toThrow();
    expect(decryptSensitiveText("legacy plaintext")).toBe("legacy plaintext");
  });

  it("rejects duplicate key versions", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEYS", `v1:${KEY_V1},v1:${KEY_V2}`);

    expect(() => encryptSensitiveText("ambiguous-key-ring")).toThrow(
      "DATA_ENCRYPTION_KEYS contains duplicate versions",
    );
  });
});
