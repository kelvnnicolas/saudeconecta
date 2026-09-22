from unittest.mock import MagicMock, patch

from app.storage.supabase_storage import upload_avatar


@patch("app.storage.supabase_storage.get_supabase_client")
def test_upload_avatar_returns_public_url(mock_get_client):
    mock_bucket = MagicMock()
    mock_bucket.get_public_url.return_value = (
        "https://example.supabase.co/storage/v1/object/public/avatars/user123.jpg"
    )
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    mock_get_client.return_value = mock_client

    url = upload_avatar("user123.jpg", b"fake-image-bytes", "image/jpeg")

    mock_bucket.upload.assert_called_once_with(
        "user123.jpg", b"fake-image-bytes", {"content-type": "image/jpeg", "upsert": "true"}
    )
    assert url == "https://example.supabase.co/storage/v1/object/public/avatars/user123.jpg"
