import time
import uuid
from dataclasses import dataclass

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

from app.core.auth import decode_supabase_token


@dataclass
class _FakeSigningKey:
    key: object


class _FakeJWKClient:
    def __init__(self, key):
        self._key = key

    def get_signing_key_from_jwt(self, token):
        return _FakeSigningKey(key=self._key)


def _generate_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


def _make_token(private_pem, **claim_overrides):
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "role": "authenticated",
        "email": "user@example.com",
        "exp": time.time() + 3600,
    }
    payload.update(claim_overrides)
    token = jwt.encode(payload, private_pem, algorithm="RS256")
    return token, payload


def test_decode_supabase_token_returns_payload_for_valid_token():
    private_pem, public_pem = _generate_keypair()
    token, payload = _make_token(private_pem)
    jwk_client = _FakeJWKClient(public_pem)

    result = decode_supabase_token(token, jwk_client)

    assert result["sub"] == payload["sub"]
    assert result["email"] == "user@example.com"


def test_decode_supabase_token_rejects_expired_token():
    private_pem, public_pem = _generate_keypair()
    token, _ = _make_token(private_pem, exp=time.time() - 10)
    jwk_client = _FakeJWKClient(public_pem)

    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_token(token, jwk_client)
    assert exc_info.value.status_code == 401


def test_decode_supabase_token_rejects_wrong_audience():
    private_pem, public_pem = _generate_keypair()
    token, _ = _make_token(private_pem, aud="wrong-audience")
    jwk_client = _FakeJWKClient(public_pem)

    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_token(token, jwk_client)
    assert exc_info.value.status_code == 401


def test_decode_supabase_token_rejects_bad_signature():
    private_pem_a, _ = _generate_keypair()
    _, public_pem_b = _generate_keypair()
    token, _ = _make_token(private_pem_a)
    jwk_client = _FakeJWKClient(public_pem_b)

    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_token(token, jwk_client)
    assert exc_info.value.status_code == 401
