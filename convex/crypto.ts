"use node";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

class CryptoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoConfigError";
  }
}

class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new CryptoConfigError("ENCRYPTION_KEY environment variable is not set");
  }
  // Key must be 32 bytes for AES-256
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new CryptoConfigError("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return keyBuffer;
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  try {
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData (all hex)
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    // Log the error but don't expose details
    console.error("[crypto] Encryption failed:", error instanceof Error ? error.message : "Unknown error");
    throw new Error("Encryption failed");
  }
}

export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new DecryptionError("Invalid encrypted data format");
  }

  const [ivHex, authTagHex, encrypted] = parts;

  // Validate hex strings
  if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(authTagHex)) {
    throw new DecryptionError("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new DecryptionError("Invalid IV length");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new DecryptionError("Invalid auth tag length");
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // Log the error but don't expose details (could be tampering or wrong key)
    console.error("[crypto] Decryption failed:", error instanceof Error ? error.message : "Unknown error");
    throw new DecryptionError("Decryption failed - data may be corrupted or tampered");
  }
}

// Export error types for external use
export { CryptoConfigError, DecryptionError };
