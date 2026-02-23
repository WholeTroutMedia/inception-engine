"""Tests for Encryption and Key Management."""
import pytest
import json
from src.security.encryption import (
    EncryptionService, EncryptionAlgorithm,
    EncryptedPayload, KeyManager, TLSConfig,
)


class TestKeyManager:
    def test_init_creates_default_key(self):
        km = KeyManager(master_key="test-master-key-for-encryption!")
        assert km.active_key_id is not None
        key_id, key = km.get_key()
        assert len(key) == 32  # 256-bit key

    def test_init_auto_generates_key(self):
        km = KeyManager()
        assert km.active_key_id is not None

    def test_rotate_key(self):
        km = KeyManager(master_key="test-master-key-for-encryption!")
        old_id = km.active_key_id
        new_id = km.rotate_key("new-master-key-for-rotation-test!")
        assert new_id != old_id
        assert km.active_key_id == new_id

    def test_get_old_key_after_rotation(self):
        km = KeyManager(master_key="test-master-key-for-encryption!")
        old_id = km.active_key_id
        km.rotate_key()
        old_key_id, old_key = km.get_key(old_id)
        assert old_key_id == old_id

    def test_get_nonexistent_key_raises(self):
        km = KeyManager()
        with pytest.raises(ValueError):
            km.get_key("nonexistent-key-id")


class TestEncryptionServiceAESGCM:
    def test_encrypt_decrypt_bytes(self):
        svc = EncryptionService()
        plaintext = b"Hello, Inception Engine!"
        payload = svc.encrypt(plaintext)
        assert payload.algorithm == EncryptionAlgorithm.AES_256_GCM
        assert payload.ciphertext != plaintext
        decrypted = svc.decrypt(payload)
        assert decrypted == plaintext

    def test_encrypt_decrypt_with_aad(self):
        svc = EncryptionService()
        plaintext = b"Sensitive data"
        aad = b"additional-authenticated-data"
        payload = svc.encrypt(plaintext, associated_data=aad)
        decrypted = svc.decrypt(payload, associated_data=aad)
        assert decrypted == plaintext

    def test_decrypt_wrong_aad_fails(self):
        svc = EncryptionService()
        plaintext = b"Sensitive data"
        aad = b"correct-aad"
        payload = svc.encrypt(plaintext, associated_data=aad)
        with pytest.raises(Exception):
            svc.decrypt(payload, associated_data=b"wrong-aad")

    def test_encrypt_string(self):
        svc = EncryptionService()
        original = "Test string for encryption"
        encrypted = svc.encrypt_string(original)
        assert encrypted != original
        decrypted = svc.decrypt_string(encrypted)
        assert decrypted == original

    def test_encrypt_dict(self):
        svc = EncryptionService()
        data = {"user": "test", "role": "admin", "active": True}
        encrypted = svc.encrypt_dict(data)
        decrypted = svc.decrypt_dict(encrypted)
        assert decrypted == data

    def test_different_encryptions_produce_different_ciphertext(self):
        svc = EncryptionService()
        plaintext = b"Same data"
        p1 = svc.encrypt(plaintext)
        p2 = svc.encrypt(plaintext)
        assert p1.ciphertext != p2.ciphertext  # Different nonces


class TestEncryptionServiceFernet:
    def test_fernet_encrypt_decrypt(self):
        svc = EncryptionService()
        plaintext = b"Fernet encrypted data"
        payload = svc.encrypt(
            plaintext, algorithm=EncryptionAlgorithm.FERNET
        )
        assert payload.algorithm == EncryptionAlgorithm.FERNET
        assert payload.nonce is None
        decrypted = svc.decrypt(payload)
        assert decrypted == plaintext


class TestEncryptedPayload:
    def test_to_dict_and_from_dict(self):
        svc = EncryptionService()
        plaintext = b"Roundtrip test"
        payload = svc.encrypt(plaintext)
        d = payload.to_dict()
        assert "ciphertext" in d
        assert "algorithm" in d
        assert "key_id" in d
        restored = EncryptedPayload.from_dict(d)
        assert restored.algorithm == payload.algorithm
        assert restored.key_id == payload.key_id
        decrypted = svc.decrypt(restored)
        assert decrypted == plaintext


class TestKeyRotationWithEncryption:
    def test_decrypt_after_rotation(self):
        km = KeyManager(master_key="rotation-test-key-32chars-min!!")
        svc = EncryptionService(key_manager=km)
        plaintext = b"Data before rotation"
        payload = svc.encrypt(plaintext)
        km.rotate_key()
        decrypted = svc.decrypt(payload)
        assert decrypted == plaintext

    def test_encrypt_uses_new_key_after_rotation(self):
        km = KeyManager(master_key="rotation-test-key-32chars-min!!")
        svc = EncryptionService(key_manager=km)
        old_key_id = km.active_key_id
        km.rotate_key()
        new_payload = svc.encrypt(b"New data")
        assert new_payload.key_id != old_key_id


class TestTLSConfig:
    def test_default_config(self):
        config = TLSConfig()
        assert config.min_version == "TLSv1.2"
        assert config.enforce_https is True

    def test_uvicorn_config_without_certs(self):
        config = TLSConfig()
        assert config.to_uvicorn_config() == {}

    def test_uvicorn_config_with_certs(self):
        config = TLSConfig(
            cert_path="/etc/ssl/cert.pem",
            key_path="/etc/ssl/key.pem",
        )
        uv_config = config.to_uvicorn_config()
        assert "ssl_certfile" in uv_config
        assert "ssl_keyfile" in uv_config

    def test_ssl_context_params(self):
        config = TLSConfig(
            cert_path="/etc/ssl/cert.pem",
            key_path="/etc/ssl/key.pem",
        )
        params = config.get_ssl_context_params()
        assert params["certfile"] == "/etc/ssl/cert.pem"
        assert params["minimum_version"] == "TLSv1.2"
