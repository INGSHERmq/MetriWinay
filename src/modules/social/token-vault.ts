import crypto from "node:crypto";
import { env } from "@/lib/config";

type EncryptedToken = {
  ciphertext: string;
  iv: string;
  tag: string;
};

function getKey() {
  if (!env.TOKEN_ENCRYPTION_KEY_BASE64) {
    throw new Error("TOKEN_ENCRYPTION_KEY_BASE64 is required to encrypt tokens.");
  }

  const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY_BASE64, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY_BASE64 must decode to 32 bytes.");
  }
  return key;
}

export function encryptToken(value: string): EncryptedToken {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64")
  };
}

export function decryptToken(payload: EncryptedToken): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}
