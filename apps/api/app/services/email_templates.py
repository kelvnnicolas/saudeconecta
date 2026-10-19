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


def nova_mensagem_recebida(link_contato: str) -> tuple[str, str, str]:
    assunto = "Você recebeu uma nova mensagem no SaúdeConecta"
    texto = f"Você recebeu uma nova mensagem.\n\nVeja a conversa: {link_contato}\n"
    html = (
        "<p>Você recebeu uma nova mensagem.</p>"
        f'<p><a href="{escape(link_contato)}">Ver a conversa</a></p>'
    )
    return assunto, texto, html


def aceite_demanda_direta(link_contato: str) -> tuple[str, str, str]:
    assunto = "O profissional aceitou sua demanda direta"
    texto = (
        "O profissional aceitou atender sua demanda direta.\n\n" f"Veja o contato: {link_contato}\n"
    )
    html = (
        "<p>O profissional aceitou atender sua demanda direta.</p>"
        f'<p><a href="{escape(link_contato)}">Ver o contato</a></p>'
    )
    return assunto, texto, html
