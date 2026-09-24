import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy import exists, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import erro_negocio
from app.models.contato import Contato, OrigemContato
from app.models.demanda import Demanda, StatusDemanda
from app.models.empresa import Empresa
from app.models.especialidade import Especialidade
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional
from app.schemas.demanda import (
    DemandaCreate,
    DemandaDetalheEmpresa,
    DemandaDetalheProfissional,
    DemandaRead,
    InteressadoRead,
    MinhaDemandaRead,
)
from app.services import email_templates
from app.services.email_service import enviar_email
from app.services.entitlements import verificar_publicacao_demanda

MENSAGEM_INTERESSE_PADRAO = "Tenho interesse na sua demanda."
TRANSICOES_PERMITIDAS = (StatusDemanda.preenchida, StatusDemanda.encerrada)


def status_efetivo(demanda: Demanda) -> StatusDemanda:
    if demanda.status == StatusDemanda.aberta and demanda.expira_em <= datetime.now(UTC):
        return StatusDemanda.expirada
    return demanda.status


def _nao_encontrada():
    return erro_negocio(status.HTTP_404_NOT_FOUND, "demanda_inexistente", "Demanda não encontrada")


def _campos_leitura(demanda: Demanda, empresa_nome: str) -> dict:
    return {
        "id": demanda.id,
        "empresa_id": demanda.empresa_id,
        "empresa_nome": empresa_nome,
        "especialidade_id": demanda.especialidade_id,
        "especialidade_nome": demanda.especialidade.nome,
        "cidade": demanda.cidade,
        "estado": demanda.estado,
        "bairro": demanda.bairro,
        "data_inicio": demanda.data_inicio,
        "turno": demanda.turno,
        "descricao": demanda.descricao,
        "valor_oferecido": (
            float(demanda.valor_oferecido) if demanda.valor_oferecido is not None else None
        ),
        "status": status_efetivo(demanda),
        "expira_em": demanda.expira_em,
        "criado_em": demanda.criado_em,
    }


def _nome_empresa(db: Session, empresa_id: uuid.UUID) -> str:
    return db.get(Empresa, empresa_id).nome_fantasia


def _exigir_papel(db: Session, user_id: uuid.UUID, papel: Papel) -> Profile:
    profile = db.get(Profile, user_id)
    if profile is None or profile.papel != papel:
        code = "apenas_empresas" if papel == Papel.empresa else "apenas_profissionais"
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN, code, f"Recurso disponível só para perfis {papel.value}"
        )
    return profile


def criar_demanda(db: Session, user_id: uuid.UUID, data: DemandaCreate) -> DemandaRead:
    empresa = verificar_publicacao_demanda(db, user_id)
    if db.get(Especialidade, data.especialidade_id) is None:
        raise erro_negocio(
            status.HTTP_400_BAD_REQUEST, "especialidade_inexistente", "Especialidade inexistente"
        )
    demanda = Demanda(empresa_id=empresa.user_id, status=StatusDemanda.aberta, **data.model_dump())
    db.add(demanda)
    db.commit()
    db.refresh(demanda)
    return DemandaRead(**_campos_leitura(demanda, empresa.nome_fantasia))


def listar_minhas(db: Session, user_id: uuid.UUID) -> list[MinhaDemandaRead]:
    _exigir_papel(db, user_id, Papel.empresa)
    empresa = db.get(Empresa, user_id)
    if empresa is None:
        return []
    linhas = db.execute(
        select(Demanda, func.count(Contato.id))
        .outerjoin(Contato, Contato.demanda_id == Demanda.id)
        .where(Demanda.empresa_id == user_id)
        .group_by(Demanda.id)
        .order_by(Demanda.criado_em.desc())
    ).all()
    return [
        MinhaDemandaRead(
            **_campos_leitura(demanda, empresa.nome_fantasia), interessados_count=total
        )
        for demanda, total in linhas
    ]


def listar_oportunidades(
    db: Session,
    user_id: uuid.UUID,
    especialidade_id: int | None,
    cidade: str | None,
    limit: int,
    offset: int,
) -> tuple[list[DemandaRead], int]:
    profile = _exigir_papel(db, user_id, Papel.profissional)
    filtros = [Demanda.status == StatusDemanda.aberta, Demanda.expira_em > func.now()]

    if especialidade_id is not None:
        filtros.append(Demanda.especialidade_id == especialidade_id)
    else:
        profissional = db.get(Profissional, user_id)
        ids = [e.id for e in profissional.especialidades] if profissional else []
        if ids:
            filtros.append(Demanda.especialidade_id.in_(ids))

    cidade_filtro = cidade or profile.cidade
    if cidade_filtro:
        filtros.append(func.lower(Demanda.cidade) == cidade_filtro.strip().lower())

    total = db.scalar(select(func.count()).select_from(Demanda).where(*filtros))
    linhas = db.execute(
        select(Demanda, Empresa.nome_fantasia)
        .join(Empresa, Empresa.user_id == Demanda.empresa_id)
        .where(*filtros)
        .order_by(Demanda.criado_em.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return [DemandaRead(**_campos_leitura(d, nome)) for d, nome in linhas], total


def obter_demanda(
    db: Session, user_id: uuid.UUID, demanda_id: uuid.UUID
) -> DemandaDetalheEmpresa | DemandaDetalheProfissional:
    demanda = db.get(Demanda, demanda_id)
    profile = db.get(Profile, user_id)
    if demanda is None or profile is None:
        raise _nao_encontrada()

    if profile.papel == Papel.empresa:
        if demanda.empresa_id != user_id:
            raise _nao_encontrada()
        linhas = db.execute(
            select(Contato, Profile)
            .join(Profile, Profile.id == Contato.profissional_id)
            .where(Contato.demanda_id == demanda.id)
            .order_by(Contato.criado_em)
        ).all()
        interessados = [
            InteressadoRead(
                contato_id=contato.id,
                profissional_id=contato.profissional_id,
                nome=perfil.nome,
                avatar_url=perfil.avatar_url,
                criado_em=contato.criado_em,
            )
            for contato, perfil in linhas
        ]
        return DemandaDetalheEmpresa(
            **_campos_leitura(demanda, _nome_empresa(db, demanda.empresa_id)),
            interessados=interessados,
        )

    if status_efetivo(demanda) != StatusDemanda.aberta:
        raise _nao_encontrada()
    ja_demonstrou = db.scalar(
        select(exists().where(Contato.demanda_id == demanda.id, Contato.profissional_id == user_id))
    )
    return DemandaDetalheProfissional(
        **_campos_leitura(demanda, _nome_empresa(db, demanda.empresa_id)),
        ja_demonstrei_interesse=bool(ja_demonstrou),
    )


def atualizar_status(
    db: Session, user_id: uuid.UUID, demanda_id: uuid.UUID, novo_status: StatusDemanda
) -> DemandaRead:
    demanda = db.get(Demanda, demanda_id)
    if demanda is None or demanda.empresa_id != user_id:
        raise _nao_encontrada()
    if status_efetivo(demanda) != StatusDemanda.aberta or novo_status not in TRANSICOES_PERMITIDAS:
        raise erro_negocio(
            status.HTTP_409_CONFLICT,
            "transicao_invalida",
            "Só é possível mudar uma demanda aberta para preenchida ou encerrada",
        )
    demanda.status = novo_status
    db.commit()
    db.refresh(demanda)
    return DemandaRead(**_campos_leitura(demanda, _nome_empresa(db, demanda.empresa_id)))


def demonstrar_interesse(
    db: Session, user_id: uuid.UUID, demanda_id: uuid.UUID, mensagem: str | None
) -> Contato:
    _exigir_papel(db, user_id, Papel.profissional)
    if db.get(Profissional, user_id) is None:
        raise erro_negocio(
            status.HTTP_400_BAD_REQUEST,
            "perfil_profissional_incompleto",
            "Complete seu perfil profissional (PUT /profissionais/me) antes",
        )
    demanda = db.get(Demanda, demanda_id)
    if demanda is None:
        raise _nao_encontrada()
    if status_efetivo(demanda) != StatusDemanda.aberta:
        raise erro_negocio(
            status.HTTP_410_GONE, "demanda_indisponivel", "Esta demanda não está mais aberta"
        )

    ja_existe = erro_negocio(
        status.HTTP_409_CONFLICT,
        "interesse_existente",
        "Você já demonstrou interesse nesta demanda",
    )
    if db.scalar(
        select(exists().where(Contato.demanda_id == demanda.id, Contato.profissional_id == user_id))
    ):
        raise ja_existe

    contato = Contato(
        solicitante_id=demanda.empresa_id,
        profissional_id=user_id,
        mensagem=mensagem or MENSAGEM_INTERESSE_PADRAO,
        origem=OrigemContato.demanda,
        demanda_id=demanda.id,
    )
    db.add(contato)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ja_existe from exc
    db.refresh(contato)

    empresa_profile = db.get(Profile, demanda.empresa_id)
    if empresa_profile is not None and empresa_profile.email:
        link = f"{get_settings().app_url}/contatos/{contato.id}"
        enviar_email(empresa_profile.email, *email_templates.novo_interesse_em_demanda(link))
    return contato
