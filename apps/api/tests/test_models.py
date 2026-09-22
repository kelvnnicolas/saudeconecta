import uuid

from app.models import Empresa, Especialidade, Papel, Profile, Profissional, TipoEmpresa


def test_create_profissional_with_especialidade(db_session):
    profile = Profile(
        id=uuid.uuid4(),
        papel=Papel.profissional,
        nome="Maria Silva",
        cidade="São Paulo",
        estado="SP",
    )
    db_session.add(profile)
    db_session.flush()

    especialidade = Especialidade(nome="Acupuntura")
    db_session.add(especialidade)
    db_session.flush()

    profissional = Profissional(
        user_id=profile.id, bio="Fisioterapeuta domiciliar", preco_hora=120.00
    )
    profissional.especialidades.append(especialidade)
    db_session.add(profissional)
    db_session.commit()

    saved = db_session.get(Profissional, profile.id)
    assert saved.bio == "Fisioterapeuta domiciliar"
    assert saved.especialidades[0].nome == "Acupuntura"


def test_create_empresa(db_session):
    profile = Profile(id=uuid.uuid4(), papel=Papel.empresa, nome="Clínica Vida")
    db_session.add(profile)
    db_session.flush()

    empresa = Empresa(
        user_id=profile.id,
        nome_fantasia="Clínica Vida",
        tipo=TipoEmpresa.clinica,
        cidade="Curitiba",
        estado="PR",
    )
    db_session.add(empresa)
    db_session.commit()

    saved = db_session.get(Empresa, profile.id)
    assert saved.tipo == TipoEmpresa.clinica
    assert saved.nome_fantasia == "Clínica Vida"
