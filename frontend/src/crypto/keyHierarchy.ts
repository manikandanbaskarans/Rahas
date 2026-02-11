/**
 * Key Hierarchy Management
 *
 * Master Key → encrypts Vault Key → encrypts Item Keys → encrypt secrets
 *
 * Flow:
 * 1. Master Key derived from password (never stored)
 * 2. Vault Key generated on registration, encrypted with Master Key, stored on server
 * 3. Each secret has a unique Item Key, encrypted with Vault Key
 */

import { encrypt, decrypt, generateRandomKey, exportKey, importKey, encryptBuffer, decryptBuffer } from './encryption';

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateVaultKey(): Promise<CryptoKey> {
  return generateRandomKey();
}

export async function encryptVaultKey(
  vaultKey: CryptoKey,
  masterKey: CryptoKey
): Promise<string> {
  const rawVaultKey = await exportKey(vaultKey);
  const encrypted = await encryptBuffer(rawVaultKey, masterKey);
  return bufferToBase64(encrypted);
}

export async function decryptVaultKey(
  encryptedVaultKey: string,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedBuffer = base64ToBuffer(encryptedVaultKey);
  const rawVaultKey = await decryptBuffer(encryptedBuffer, masterKey);
  return importKey(rawVaultKey, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']);
}

export async function generateItemKey(): Promise<CryptoKey> {
  return generateRandomKey();
}

export async function encryptItemKey(
  itemKey: CryptoKey,
  vaultKey: CryptoKey
): Promise<string> {
  const rawItemKey = await exportKey(itemKey);
  const encrypted = await encryptBuffer(rawItemKey, vaultKey);
  return bufferToBase64(encrypted);
}

export async function decryptItemKey(
  encryptedItemKey: string,
  vaultKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedBuffer = base64ToBuffer(encryptedItemKey);
  const rawItemKey = await decryptBuffer(encryptedBuffer, vaultKey);
  return importKey(rawItemKey);
}

export async function encryptSecret(
  plaintext: string,
  itemKey: CryptoKey
): Promise<string> {
  return encrypt(plaintext, itemKey);
}

export async function decryptSecret(
  ciphertext: string,
  itemKey: CryptoKey
): Promise<string> {
  return decrypt(ciphertext, itemKey);
}

export interface EncryptedSecretBundle {
  nameEncrypted: string;
  dataEncrypted: string;
  encryptedItemKey: string;
  metadataEncrypted: string | null;
}

export async function encryptSecretBundle(
  name: string,
  data: string,
  metadata: Record<string, unknown> | null,
  vaultKey: CryptoKey
): Promise<EncryptedSecretBundle> {
  const itemKey = await generateItemKey();

  const [nameEncrypted, dataEncrypted, encryptedItemKey] = await Promise.all([
    encryptSecret(name, itemKey),
    encryptSecret(data, itemKey),
    encryptItemKey(itemKey, vaultKey),
  ]);

  let metadataEncrypted: string | null = null;
  if (metadata) {
    metadataEncrypted = await encryptSecret(JSON.stringify(metadata), itemKey);
  }

  return { nameEncrypted, dataEncrypted, encryptedItemKey, metadataEncrypted };
}

export async function decryptSecretBundle(
  nameEncrypted: string,
  dataEncrypted: string,
  encryptedItemKey: string,
  metadataEncrypted: string | null,
  vaultKey: CryptoKey
): Promise<{ name: string; data: string; metadata: Record<string, unknown> | null }> {
  const itemKey = await decryptItemKey(encryptedItemKey, vaultKey);

  const [name, data] = await Promise.all([
    decryptSecret(nameEncrypted, itemKey),
    decryptSecret(dataEncrypted, itemKey),
  ]);

  let metadata: Record<string, unknown> | null = null;
  if (metadataEncrypted) {
    const metadataStr = await decryptSecret(metadataEncrypted, itemKey);
    metadata = JSON.parse(metadataStr);
  }

  return { name, data, metadata };
}
