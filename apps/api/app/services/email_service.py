import httpx
import sentry_sdk

from app.core.config import get_settings

RESEND_API_URL = "https://api.resend.com/emails"
REMETENTE = "SaúdeConecta <onboarding@resend.dev>"


def enviar_email(para: str, assunto: str, texto: str, html: str | None = None) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        return
    corpo = {"from": REMETENTE, "to": [para], "subject": assunto, "text": texto}
    if html is not None:
        corpo["html"] = html
    try:
        httpx.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json=corpo,
            timeout=10,
        )
    except Exception as exc:
        sentry_sdk.capture_exception(exc)


def send_contact_notification_email(to_email: str, solicitante_nome: str, mensagem: str) -> None:
    enviar_email(
        to_email,
        "Você recebeu um novo contato no SaúdeConecta",
        f"{solicitante_nome} enviou uma mensagem:\n\n{mensagem}",
    )
