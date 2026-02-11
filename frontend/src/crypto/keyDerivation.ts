/**
 * Key Derivation using Argon2id (via argon2-browser WASM) or PBKDF2 fallback.
 *
 * Derives two keys from the master password:
 * - Auth Key: sent to server for authentication
 * - Master Key: never leaves client, used for encrypting vault key
 */

const ARGON2_MEMORY = 65536; // 64MB
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 4;
const KEY_LENGTH = 32; // 256 bits

export interface DerivedKeys {
  authKey: string;
  masterKey: CryptoKey;
  masterKeyRaw: ArrayBuffer;
}

function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKeyPBKDF2(
  password: string,
  salt: string,
  iterations: number = 600000
): Promise<ArrayBuffer> {
  const passwordBuffer = stringToBuffer(password);
  const saltBuffer = stringToBuffer(salt);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer.buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    KEY_LENGTH * 8
  );
}

async function deriveKeyArgon2(
  password: string,
  salt: string,
  _memory: number = ARGON2_MEMORY,
  _iterations: number = ARGON2_ITERATIONS
): Promise<ArrayBuffer> {
  try {
    const argon2 = await import('argon2-browser');
    const result = await argon2.hash({
      pass: password,
      salt,
      time: _iterations,
      mem: _memory,
      parallelism: ARGON2_PARALLELISM,
      hashLen: KEY_LENGTH,
      type: argon2.ArgonType.Argon2id,
    });
    return result.hash.buffer as ArrayBuffer;
  } catch {
    // Fallback to PBKDF2 if Argon2 WASM is not available
    console.warn('Argon2 not available, falling back to PBKDF2');
    return deriveKeyPBKDF2(password, salt);
  }
}

export async function deriveKeys(
  masterPassword: string,
  email: string,
  kdfMemory: number = ARGON2_MEMORY,
  kdfIterations: number = ARGON2_ITERATIONS
): Promise<DerivedKeys> {
  const authSalt = email.toLowerCase() + 'auth';
  const encSalt = email.toLowerCase() + 'enc';

  const [authKeyRaw, masterKeyRaw] = await Promise.all([
    deriveKeyArgon2(masterPassword, authSalt, kdfMemory, kdfIterations),
    deriveKeyArgon2(masterPassword, encSalt, kdfMemory, kdfIterations),
  ]);

  const authKey = bufferToBase64(authKeyRaw);

  const masterKey = await crypto.subtle.importKey(
    'raw',
    masterKeyRaw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  return { authKey, masterKey, masterKeyRaw };
}

export { bufferToBase64, bufferToHex };
