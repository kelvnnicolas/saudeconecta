import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.assinatura import Assinatura, StatusAssinatura
from app.models.contato import Contato
from app.models.demanda import Demanda, StatusDemanda
from app.models.empresa import Empresa, TipoEmpresa
from app.models.especialidade import Especialidade
from app.models.notificacao import Notificacao, TipoNotificacao
from app.models.plano import Plano
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional

DESCRICAO_SENSIVEL = "Paciente com diagnóstico reservado, plantão em UTI"


def autenticar(user_id: uuid.UUID) -> None:
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email=None, role="authenticated"
    )


def especialidade(db, nome: str = "Enfermagem") -> Especialidade:
    return db.scalar(select(Especialidade).where(Especialidade.nome == nome))


def plano(db, codigo: str = "essencial") -> Plano:
    return db.scalar(select(Plano).where(Plano.codigo == codigo))


def criar_empresa(
    db,
    tipo: TipoEmpresa = TipoEmpresa.clinica,
    email: str | None = "empresa@example.com",
    nome: str = "Clínica Vida",
) -> uuid.UUID:
    user_id = uuid.uuid4()
    db.add(Profile(id=user_id, papel=Papel.empresa, nome=nome, email=email, estado="SP"))
    db.flush()
    db.add(Empresa(user_id=user_id, nome_fantasia=nome, tipo=tipo, cidade="São Paulo", estado="SP"))
    db.flush()
    return user_id


def criar_profissional(
    db,
    especialidades: tuple[str, ...] = ("Enfermagem",),
    cidade: str | None = "São Paulo",
    com_perfil_profissional: bool = True,
    nome: str = "Maria Silva",
) -> uuid.UUID:
    user_id = uuid.uuid4()
    db.add(
        Profile(
            id=user_id,
            papel=Papel.profissional,
            nome=nome,
            email=f"{user_id}@example.com",
            cidade=cidade,
            estado="SP",
        )
    )
    db.flush()
    if com_perfil_profissional:
        profissional = Profissional(user_id=user_id)
        profissional.especialidades = [especialidade(db, nome) for nome in especialidades]
        db.add(profissional)
        db.flush()
    return user_id


def criar_contato(
    db,
    solicitante_id: uuid.UUID,
    profissional_id: uuid.UUID,
    mensagem: str = "Preciso de um profissional para plantão",
) -> Contato:
    contato = Contato(
        solicitante_id=solicitante_id,
        profissional_id=profissional_id,
        mensagem=mensagem,
    )
    db.add(contato)
    db.flush()
    return contato


def criar_assinatura(
    db,
    empresa_id: uuid.UUID,
    status: StatusAssinatura = StatusAssinatura.active,
    plano_codigo: str = "essencial",
    subscription_id: str | None = None,
    customer_id: str = "cus_test_existente",
) -> Assinatura:
    assinatura = Assinatura(
        empresa_id=empresa_id,
        plano_id=plano(db, plano_codigo).id,
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id,
        status=status,
    )
    db.add(assinatura)
    db.flush()
    return assinatura


def criar_demanda(
    db,
    empresa_id: uuid.UUID,
    especialidade_nome: str = "Enfermagem",
    cidade: str = "São Paulo",
    status: StatusDemanda = StatusDemanda.aberta,
    expira_em: datetime | None = None,
) -> Demanda:
    demanda = Demanda(
        empresa_id=empresa_id,
        especialidade_id=especialidade(db, especialidade_nome).id,
        cidade=cidade,
        estado="SP",
        data_inicio=date(2026, 10, 1),
        turno="Noturno 19h-7h",
        descricao=DESCRICAO_SENSIVEL,
        status=status,
        expira_em=expira_em or datetime.now(UTC) + timedelta(days=30),
    )
    db.add(demanda)
    db.flush()
    return demanda


def criar_notificacao(
    db,
    destinatario_id: uuid.UUID,
    tipo: TipoNotificacao = TipoNotificacao.novo_contato,
    titulo: str = "Novo contato recebido",
    corpo: str = "Alguém enviou uma mensagem.",
    link: str = "/contatos/1",
    lida_em: datetime | None = None,
) -> Notificacao:
    notificacao = Notificacao(
        destinatario_id=destinatario_id,
        tipo=tipo,
        titulo=titulo,
        corpo=corpo,
        link=link,
        lida_em=lida_em,
    )
    db.add(notificacao)
    db.flush()
    return notificacao


def payload_demanda(db, **sobrescritas) -> dict:
    dados = {
        "especialidade_id": especialidade(db).id,
        "cidade": "São Paulo",
        "estado": "SP",
        "bairro": "Pinheiros",
        "data_inicio": "2026-10-01",
        "turno": "Noturno 19h-7h",
        "descricao": DESCRICAO_SENSIVEL,
        "valor_oferecido": "350.00",
    }
    dados.update(sobrescritas)
    return dados
