import httpx
import sentry_sdk

from app.core.config import get_settings

RESEND_API_URL = "https://api.resend.com/emails"


def send_contact_notification_email(to_email: str, solicitante_nome: str, mensagem: str) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        return
    try:
        httpx.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": "SaúdeConecta <onboarding@resend.dev>",
                "to": [to_email],
                "subject": "Você recebeu um novo contato no SaúdeConecta",
                "text": f"{solicitante_nome} enviou uma mensagem:\n\n{mensagem}",
            },
            timeout=10,
        )
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
