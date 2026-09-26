import ssl
import uuid
from dataclasses import dataclass
from functools import lru_cache

import certifi
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

security = HTTPBearer(auto_error=False)

# Sem isso, PyJWKClient usa o cacert do sistema pra buscar o JWKS da Supabase —
# em instalações de Python do python.org no macOS isso costuma faltar
# (certificate verify failed: unable to get local issuer certificate) e todo
# login falha com 401 mesmo com um JWT válido. certifi empacota um bundle
# próprio, então isso funciona igual em qualquer máquina/CI.
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())


@dataclass
class CurrentUser:
    id: uuid.UUID
    email: str | None
    role: str | None


@lru_cache
def get_jwk_client() -> jwt.PyJWKClient:
    settings = get_settings()
    return jwt.PyJWKClient(
        f"{settings.supabase_url}/auth/v1/.well-known/jwks.json", ssl_context=_SSL_CONTEXT
    )


def decode_supabase_token(token: str, jwk_client: jwt.PyJWKClient) -> dict:
    try:
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado"
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token não fornecido")
    payload = decode_supabase_token(credentials.credentials, get_jwk_client())
    return CurrentUser(
        id=uuid.UUID(payload["sub"]),
        email=payload.get("email"),
        role=payload.get("role"),
    )
