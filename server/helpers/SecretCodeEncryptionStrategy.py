from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import hashlib
import base64
import os

class SecretCodeEncryptionStrategy:
    """
    Strategy class for secret_code encryption/decryption using AES-GCM.
    This replaces the imperative logic but keeps the original
    encrypt_secret_code / decrypt_secret_code function names and behavior.
    """
    def __init__(self, secret_key: str):
        self._key = hashlib.sha256(secret_key.encode()).digest()
        self._aesgcm = AESGCM(self._key)

    @property
    def key(self) -> bytes:
        return self._key

    def encrypt(self, plain_text: str) -> str:
        if not plain_text:
            return ""
        iv = os.urandom(12)
        ciphertext = self._aesgcm.encrypt(iv, plain_text.encode("utf-8"), None)
        combined = iv + ciphertext
        return base64.urlsafe_b64encode(combined).decode("utf-8")

    def decrypt(self, encrypted_text: str) -> str:
        if not encrypted_text:
            return ""
        try:
            # Add padding if missing (frontend removes padding)
            padding = len(encrypted_text) % 4
            if padding:
                encrypted_text += '=' * (4 - padding)
            
            combined = base64.urlsafe_b64decode(encrypted_text.encode("utf-8"))
            iv = combined[:12]
            ciphertext = combined[12:]
            plaintext = self._aesgcm.decrypt(iv, ciphertext, None)
            return plaintext.decode("utf-8")
        except Exception as e:
            print(f"Decryption error: {e}")
            return ""
