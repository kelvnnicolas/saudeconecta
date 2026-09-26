from html import escape


def novo_interesse_em_demanda(link_contato: str) -> tuple[str, str, str]:
    assunto = "Um profissional demonstrou interesse na sua demanda"
    texto = (
        "Olá,\n\n"
        "Um profissional demonstrou interesse na sua demanda no SaúdeConecta.\n"
        f"Veja o contato: {link_contato}\n"
    )
    html = (
        "<p>Olá,</p>"
        "<p>Um profissional demonstrou interesse na sua demanda no SaúdeConecta.</p>"
        f'<p><a href="{escape(link_contato)}">Ver o contato</a></p>'
    )
    return assunto, texto, html


def falha_pagamento_assinatura(link_assinatura: str) -> tuple[str, str, str]:
    assunto = "Não conseguimos processar o pagamento da sua assinatura"
    texto = (
        "Olá,\n\n"
        "Não conseguimos processar o pagamento da sua assinatura do SaúdeConecta.\n"
        f"Atualize seu cartão pelo portal de assinatura: {link_assinatura}\n"
    )
    html = (
        "<p>Olá,</p>"
        "<p>Não conseguimos processar o pagamento da sua assinatura do SaúdeConecta.</p>"
        f'<p><a href="{escape(link_assinatura)}">Atualizar forma de pagamento</a></p>'
    )
    return assunto, texto, html
