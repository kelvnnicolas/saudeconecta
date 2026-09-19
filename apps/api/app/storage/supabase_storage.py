from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def upload_avatar(file_path_in_bucket: str, file_bytes: bytes, content_type: str) -> str:
    settings = get_settings()
    client = get_supabase_client()
    bucket = client.storage.from_(settings.supabase_storage_bucket)
    bucket.upload(file_path_in_bucket, file_bytes, {"content-type": content_type, "upsert": "true"})
    return bucket.get_public_url(file_path_in_bucket)
