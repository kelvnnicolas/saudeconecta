from unittest.mock import patch

from app.services.email_service import send_contact_notification_email


@patch("app.services.email_service.httpx.post")
def test_send_contact_notification_email_calls_resend_api(mock_post, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    get_settings.cache_clear()

    send_contact_notification_email("prof@example.com", "Maria Silva", "Olá, preciso de ajuda")

    mock_post.assert_called_once()
    _, kwargs = mock_post.call_args
    assert kwargs["json"]["to"] == ["prof@example.com"]
    assert "Maria Silva" in kwargs["json"]["text"]
    get_settings.cache_clear()


@patch("app.services.email_service.httpx.post")
def test_send_contact_notification_email_skips_when_no_api_key(mock_post, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("RESEND_API_KEY", "")
    get_settings.cache_clear()

    send_contact_notification_email("prof@example.com", "Maria Silva", "Olá")

    mock_post.assert_not_called()
    get_settings.cache_clear()


@patch("app.services.email_service.sentry_sdk.capture_exception")
@patch("app.services.email_service.httpx.post", side_effect=RuntimeError("network down"))
def test_send_contact_notification_email_reports_to_sentry_and_does_not_raise(
    mock_post, mock_capture, monkeypatch
):
    from app.core.config import get_settings

    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    get_settings.cache_clear()

    send_contact_notification_email("prof@example.com", "Maria Silva", "Olá")  # must not raise

    mock_capture.assert_called_once()
    get_settings.cache_clear()
