"""
Encryption module for Inception Engine.
Provides encryption at rest (AES-256-GCM) and TLS enforcement for in-transit.
"""

import os
import base64
import json
import hashlib
from typing import Optional, Any, Dict
from dataclasses import dataclass
from enum import Enum

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class EncryptionAlgorithm(str, Enum):
    AES_256_GCM = "aes-256-gcm"
    FERNET = "fernet"


@dataclass
class EncryptedPayload:
    """Represents an encrypted data payload."""
    ciphertext: bytes
    nonce: Optional[bytes]
    algorithm: EncryptionAlgorithm
    key_id: str
    metadata: Dict[str, str]

    def to_dict(self) -> Dict[str, str]:
        return {
            "ciphertext": base64.b64encode(self.ciphertext).decode(),
            "nonce": base64.b64encode(self.nonce).decode() if self.nonce else "",
            "algorithm": self.algorithm.value,
            "key_id": self.key_id,
            "metadata": json.dumps(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, str]) -> "EncryptedPayload":
        return cls(
            ciphertext=base64.b64decode(data["ciphertext"]),
            nonce=base64.b64decode(data["nonce"]) if data.get("nonce") else None,
            algorithm=EncryptionAlgorithm(data["algorithm"]),
            key_id=data["key_id"],
            metadata=json.loads(data.get("metadata", "{}")),
        )


class KeyManager:
    """Manages encryption keys with rotation support."""

    def __init__(self, master_key: Optional[str] = None):
        self._master_key = (
            master_key.encode() if master_key
            else os.environ.get("INCEPTION_MASTER_KEY", "").encode()
        )
        if not self._master_key:
            self._master_key = Fernet.generate_key()
        self._keys: Dict[str, bytes] = {}
        self._active_key_id: Optional[str] = None
        self._initialize_default_key()

    def _initialize_default_key(self) -> None:
        key_id = self._generate_key_id(self._master_key)
        self._keys[key_id] = self._derive_key(self._master_key)
        self._active_key_id = key_id

    def _derive_key(self, master: bytes, salt: Optional[bytes] = None) -> bytes:
        if salt is None:
            salt = hashlib.sha256(master).digest()[:16]
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,
        )
        return kdf.derive(master)

    @staticmethod
    def _generate_key_id(key_material: bytes) -> str:
        return hashlib.sha256(key_material).hexdigest()[:12]

    def rotate_key(self, new_master: Optional[str] = None) -> str:
        """Rotate to a new encryption key."""
        if new_master:
            raw = new_master.encode()
        else:
            raw = Fernet.generate_key()
        key_id = self._generate_key_id(raw)
        self._keys[key_id] = self._derive_key(raw)
        self._active_key_id = key_id
        return key_id

    def get_key(self, key_id: Optional[str] = None) -> tuple[str, bytes]:
        kid = key_id or self._active_key_id
        if kid not in self._keys:
            raise ValueError(f"Key '{kid}' not found")
        return kid, self._keys[kid]

    @property
    def active_key_id(self) -> str:
        return self._active_key_id


class EncryptionService:
    """Provides encryption at rest using AES-256-GCM."""

    def __init__(self, key_manager: Optional[KeyManager] = None):
        self.key_manager = key_manager or KeyManager()

    def encrypt(
        self,
        plaintext: bytes,
        associated_data: Optional[bytes] = None,
        algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM,
    ) -> EncryptedPayload:
        """Encrypt data at rest."""
        key_id, key = self.key_manager.get_key()

        if algorithm == EncryptionAlgorithm.AES_256_GCM:
            return self._encrypt_aes_gcm(plaintext, key, key_id, associated_data)
        elif algorithm == EncryptionAlgorithm.FERNET:
            return self._encrypt_fernet(plaintext, key, key_id)
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    def decrypt(
        self,
        payload: EncryptedPayload,
        associated_data: Optional[bytes] = None,
    ) -> bytes:
        """Decrypt data."""
        _, key = self.key_manager.get_key(payload.key_id)

        if payload.algorithm == EncryptionAlgorithm.AES_256_GCM:
            return self._decrypt_aes_gcm(payload, key, associated_data)
        elif payload.algorithm == EncryptionAlgorithm.FERNET:
            return self._decrypt_fernet(payload, key)
        raise ValueError(f"Unsupported algorithm: {payload.algorithm}")

    def encrypt_string(self, plaintext: str) -> str:
        """Convenience: encrypt a string, return base64 JSON."""
        payload = self.encrypt(plaintext.encode())
        return json.dumps(payload.to_dict())

    def decrypt_string(self, encrypted: str) -> str:
        """Convenience: decrypt a base64 JSON string."""
        data = json.loads(encrypted)
        payload = EncryptedPayload.from_dict(data)
        return self.decrypt(payload).decode()

    def encrypt_dict(self, data: Dict[str, Any]) -> str:
        """Encrypt a dictionary."""
        return self.encrypt_string(json.dumps(data))

    def decrypt_dict(self, encrypted: str) -> Dict[str, Any]:
        """Decrypt to a dictionary."""
        return json.loads(self.decrypt_string(encrypted))

    # ── AES-256-GCM ─────────────────────────────────────

    @staticmethod
    def _encrypt_aes_gcm(
        plaintext: bytes, key: bytes, key_id: str,
        associated_data: Optional[bytes] = None,
    ) -> EncryptedPayload:
        nonce = os.urandom(12)
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)
        return EncryptedPayload(
            ciphertext=ciphertext,
            nonce=nonce,
            algorithm=EncryptionAlgorithm.AES_256_GCM,
            key_id=key_id,
            metadata={"aad": "true" if associated_data else "false"},
        )

    @staticmethod
    def _decrypt_aes_gcm(
        payload: EncryptedPayload, key: bytes,
        associated_data: Optional[bytes] = None,
    ) -> bytes:
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(payload.nonce, payload.ciphertext, associated_data)

    # ── Fernet ───────────────────────────────────────────

    @staticmethod
    def _encrypt_fernet(
        plaintext: bytes, key: bytes, key_id: str
    ) -> EncryptedPayload:
        fernet_key = base64.urlsafe_b64encode(key[:32])
        f = Fernet(fernet_key)
        ciphertext = f.encrypt(plaintext)
        return EncryptedPayload(
            ciphertext=ciphertext,
            nonce=None,
            algorithm=EncryptionAlgorithm.FERNET,
            key_id=key_id,
            metadata={},
        )

    @staticmethod
    def _decrypt_fernet(payload: EncryptedPayload, key: bytes) -> bytes:
        fernet_key = base64.urlsafe_b64encode(key[:32])
        f = Fernet(fernet_key)
        return f.decrypt(payload.ciphertext)


class TLSConfig:
    """TLS configuration for in-transit encryption."""

    def __init__(
        self,
        cert_path: Optional[str] = None,
        key_path: Optional[str] = None,
        min_version: str = "TLSv1.2",
        enforce_https: bool = True,
    ):
        self.cert_path = cert_path
        self.key_path = key_path
        self.min_version = min_version
        self.enforce_https = enforce_https

    def to_uvicorn_config(self) -> Dict[str, Any]:
        """Generate uvicorn SSL config."""
        if not self.cert_path or not self.key_path:
            return {}
        return {
            "ssl_certfile": self.cert_path,
            "ssl_keyfile": self.key_path,
        }

    def get_ssl_context_params(self) -> Dict[str, Any]:
        """Get SSL context parameters."""
        return {
            "certfile": self.cert_path,
            "keyfile": self.key_path,
            "minimum_version": self.min_version,
        }
