import { SECRET_KEY } from "../config/config";

const IV_SIZE_BYTES: number = 12; // Standard nonce size for AES-GCM

// 1. Derive a stable 32-byte (256-bit) key from the secret (as a promise)
const ENCRYPTION_KEY_PROMISE: Promise<CryptoKey> = (async () => {
  const encoder: TextEncoder = new TextEncoder();
  const keyData: Uint8Array = encoder.encode(SECRET_KEY);
  const hashBuffer: ArrayBuffer = await crypto.subtle.digest('SHA-256', keyData as BufferSource);
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    'AES-GCM',
    false, // not extractable
    ['encrypt', 'decrypt']
  );
})();

// --- Base64 Helper: Buffer to URL-Safe Base64 (No Padding) ---
function bufferToUrlSafeBase64(buffer: ArrayBuffer): string {
  let binary: string = '';
  const bytes: Uint8Array = new Uint8Array(buffer);
  const len: number = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-') // Convert to URL-safe
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // Remove padding
}

// --- Base64 Helper: URL-Safe Base64 to Buffer ---
function urlSafeBase64ToBuffer(base64: string): ArrayBuffer {
  let b64: string = base64.replace(/-/g, '+').replace(/_/g, '/'); // Revert URL-safe
  const padding: number = b64.length % 4; // Re-add padding
  if (padding) b64 += '='.repeat(4 - padding);

  const binaryString: string = atob(b64);
  const buffer: Uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    buffer[i] = binaryString.charCodeAt(i);
  }
  return buffer as unknown as ArrayBuffer;
}

// --- Encryption Function ---
export async function encryptSecretCode(plainText: string): Promise<string> {
  if (!plainText) return "";
  try {
    const key: CryptoKey = await ENCRYPTION_KEY_PROMISE;
    const encoder: TextEncoder = new TextEncoder();

    // 2. Generate a new, random IV (nonce)
    const iv: Uint8Array = crypto.getRandomValues(new Uint8Array(IV_SIZE_BYTES));

    // 3. Encrypt the data
    const ciphertextBuffer: ArrayBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      encoder.encode(plainText)
    );

    // 4. Prepend the IV to the ciphertext
    const combined: Uint8Array = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertextBuffer), iv.length);

    // 5. Return as URL-safe Base64
    return bufferToUrlSafeBase64(combined as unknown as ArrayBuffer);

  } catch (error) {
    console.error("Encryption error:", error);
    throw error;
  }
}

// --- Decryption Function ---
export async function decryptSecretCode(encryptedText: string): Promise<string> {
  if (!encryptedText) return "";
  try {
    const key: CryptoKey = await ENCRYPTION_KEY_PROMISE;

    // 1. Decode from URL-safe Base64
    const combined: ArrayBuffer = urlSafeBase64ToBuffer(encryptedText);

    // 2. Extract the IV and the ciphertext
    const iv: ArrayBuffer = combined.slice(0, IV_SIZE_BYTES);
    const ciphertext: ArrayBuffer = combined.slice(IV_SIZE_BYTES);

    // 3. Decrypt and verify the authentication tag
    const decryptedBuffer: ArrayBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);

  } catch (error) {
    console.error("Decryption failed. Wrong key, tampered data, or corrupt payload:", error);
    return ""; // Fail safely
  }
}