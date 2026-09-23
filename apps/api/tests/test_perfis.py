import uuid
from unittest.mock import patch

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.profile import Papel, Profile


def test_upload_avatar_requires_authentication(client):
    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.jpg", b"fake-image-bytes", "image/jpeg")},
    )
    assert response.status_code == 401


def test_upload_avatar_requires_synced_profile(client):
    user_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert response.status_code == 400


@patch("app.services.profile_service.upload_avatar")
def test_upload_avatar_rejects_unsupported_content_type(mock_upload, client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="Maria Silva"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.gif", b"fake-image-bytes", "image/gif")},
    )

    assert response.status_code == 422
    mock_upload.assert_not_called()


@patch("app.services.profile_service.upload_avatar")
def test_upload_avatar_rejects_file_over_size_limit(mock_upload, client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="Maria Silva"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    oversized = b"x" * (5 * 1024 * 1024 + 1)
    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.jpg", oversized, "image/jpeg")},
    )

    assert response.status_code == 422
    mock_upload.assert_not_called()


@patch("app.services.profile_service.upload_avatar")
def test_upload_avatar_updates_profile_and_returns_url(mock_upload, client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="Maria Silva"))
    db_session.commit()
    mock_upload.return_value = (
        f"https://example.supabase.co/storage/v1/object/public/avatars/{user_id}.jpg"
    )

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["avatar_url"] == mock_upload.return_value
    mock_upload.assert_called_once_with(f"{user_id}.jpg", b"fake-image-bytes", "image/jpeg")

    saved = db_session.get(Profile, user_id)
    assert saved.avatar_url == mock_upload.return_value
