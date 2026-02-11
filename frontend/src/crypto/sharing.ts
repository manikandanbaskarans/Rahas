/**
 * RSA-OAEP key wrapping for secure sharing between users.
 *
 * Sharing flow:
 * 1. User A decrypts Item Key with their Vault Key
 * 2. User A encrypts Item Key with User B's RSA public key
 * 3. Server stores encrypted Item Key for User B
 * 4. User B decrypts Item Key with their RSA private key
 */

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

export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
  privateKeyEncoded: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['wrapKey', 'unwrapKey']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: bufferToBase64(publicKeyBuffer),
    privateKey: keyPair.privateKey,
    privateKeyEncoded: bufferToBase64(privateKeyBuffer),
  };
}

export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToBuffer(publicKeyBase64);
  return crypto.subtle.importKey(
    'spki',
    keyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['wrapKey']
  );
}

export async function importPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToBuffer(privateKeyBase64);
  return crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['unwrapKey']
  );
}

export async function encryptItemKeyForRecipient(
  itemKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> {
  const wrappedKey = await crypto.subtle.wrapKey(
    'raw',
    itemKey,
    recipientPublicKey,
    { name: 'RSA-OAEP' }
  );
  return bufferToBase64(wrappedKey);
}

export async function decryptItemKeyFromShare(
  encryptedItemKey: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const wrappedKeyBuffer = base64ToBuffer(encryptedItemKey);
  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBuffer,
    privateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPrivateKey(
  privateKeyEncoded: string,
  masterKey: CryptoKey
): Promise<string> {
  const { encrypt } = await import('./encryption');
  return encrypt(privateKeyEncoded, masterKey);
}

export async function decryptPrivateKey(
  encryptedPrivateKey: string,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const { decrypt } = await import('./encryption');
  const privateKeyEncoded = await decrypt(encryptedPrivateKey, masterKey);
  return importPrivateKey(privateKeyEncoded);
}
