# SaúdeConecta — HealthTech Marketplace MVP

**Marketplace de serviços de saúde | Full-stack Development | Backend Engineering | API Integration**

O **SaúdeConecta** é um MVP de marketplace desenvolvido para conectar profissionais de saúde a empresas e pessoas que precisam desses serviços. A plataforma foi concebida para facilitar a descoberta de profissionais, a gestão de contatos, a publicação de demandas e a conexão entre oferta e procura de serviços de saúde.

O projeto contempla profissionais como enfermeiros, técnicos de enfermagem, médicos, fisioterapeutas, fonoaudiólogos, nutricionistas, psicólogos e cuidadores, além de empresas como clínicas, hospitais e prestadores de homecare.

A solução foi estruturada como um produto digital full-stack, com frontend integrado a uma API própria, persistência relacional, autenticação, armazenamento de arquivos e integração com serviços externos.

> **Projeto de desenvolvimento de produto digital:** foco em arquitetura de software, implementação de regras de negócio, integração entre serviços, testes automatizados e preparação de um MVP para validação comercial.

## Demonstração e documentação

* **Aplicação web:** https://saudeconecta-pi.vercel.app
* **API e documentação interativa (Swagger):** https://saudeconecta-api.onrender.com/docs
* **Repositório:** https://github.com/kelvnnicolas/saudeconecta

*Observação: o backend roda no plano gratuito do Render, então o primeiro acesso após um período ocioso pode levar cerca de 30 segundos para responder. A demonstração depende da disponibilidade dos serviços externos. O fluxo de pagamentos utiliza o modo de teste do Stripe; a aplicação ainda requer validações de configuração e segurança antes de ser considerada pronta para produção.*

## Principais funcionalidades

### Marketplace e gestão de perfis

* Cadastro e autenticação de profissionais e empresas, com recuperação de senha por e-mail.
* Perfis públicos de profissionais e empresas.
* Cadastro e consulta de especialidades.
* Upload de fotos de perfil e logotipos.
* Busca de profissionais por nome, especialidade, localização, faixa de preço e avaliação mínima.
* Seleção de estado e cidade por lista, a partir da API pública de localidades do IBGE.

### Comunicação e reputação

* Registro de contatos entre profissionais e potenciais contratantes, com conversa por mensagens dentro de cada contato.
* Aceite de demanda direta pelo profissional.
* Notificações dentro do aplicativo (sino com itens não lidos e "marcar todas como lidas") e por e-mail via Resend.
* Avaliações vinculadas a contatos previamente registrados.
* Consulta pública das avaliações dos profissionais.

### Recursos B2B e monetização

* Planos de assinatura para empresas elegíveis.
* Checkout de assinatura recorrente via Stripe Checkout.
* Portal de gerenciamento de assinaturas e faturas.
* Publicação de demandas conforme o plano contratado.
* Identificação de oportunidades compatíveis com os profissionais.
* Manifestação de interesse em oportunidades, integrada ao fluxo de contatos.

### Analytics e observabilidade

* Relatórios de profissionais por especialidade.
* Cálculo de nota média geral.
* Métricas de contatos por período.
* Monitoramento de erros via Sentry.
* Endpoint de health check e pipeline de integração contínua.

## Arquitetura e tecnologias

O projeto utiliza uma arquitetura separada entre frontend e backend, com API REST, banco de dados relacional e serviços gerenciados para autenticação, storage e pagamentos.

| Camada                    | Tecnologias                                 |
| ------------------------- | ------------------------------------------- |
| Frontend                  | Next.js 14, React, TypeScript, App Router   |
| Interface e estilização   | Tailwind CSS                                |
| Backend                   | Python 3.11+, FastAPI                       |
| API e validação de dados  | REST, Pydantic                              |
| ORM                       | SQLAlchemy 2.0                              |
| Migrations                | Alembic                                     |
| Banco de dados            | PostgreSQL 16                               |
| Autenticação              | Supabase Auth, JWT e JWKS                   |
| Armazenamento de arquivos | Supabase Storage                            |
| Análise de dados          | Python, pandas                              |
| Pagamentos                | Stripe Checkout, Customer Portal e Webhooks |
| E-mail transacional       | Resend                                      |
| Monitoramento             | Sentry                                      |
| Testes                    | pytest, PostgreSQL real e Docker            |
| Qualidade de código       | Ruff, Black                                 |
| CI                        | GitHub Actions                              |
| Deploy                    | Vercel (frontend) e Render (backend)        |

## Engenharia de software e decisões técnicas

Além da implementação das funcionalidades, o projeto aborda aspectos importantes da construção e manutenção de aplicações web.

**API e regras de negócio**

* Endpoints organizados por domínio funcional.
* Separação entre rotas, schemas, modelos, serviços e configuração.
* Validação de dados e tratamento consistente de erros de negócio.
* Documentação interativa da API via Swagger/OpenAPI.

**Banco de dados e evolução do esquema**

* Modelagem relacional com PostgreSQL.
* Migrations versionadas e reversíveis via Alembic.
* Regras de autorização e políticas de Row-Level Security (RLS) em tabelas selecionadas de faturamento, demandas e notificações.

**Autenticação e integrações**

* Validação de tokens JWT do Supabase utilizando JWKS.
* Sincronização do perfil autenticado com o backend.
* Upload de arquivos com validação de formato e tamanho.
* Integração com Stripe para assinaturas, eventos de webhook e consulta do estado da assinatura.
* Processamento idempotente de webhooks e releitura do estado da assinatura na origem.

**Testes e qualidade**

* 243 testes automatizados de backend, executados contra PostgreSQL real em ambiente de desenvolvimento com Docker; lint com Ruff e Black sem pendências.
* CI com GitHub Actions para lint e testes do backend.
* Testes manuais ponta a ponta dos principais fluxos de autenticação, busca, contatos, avaliações e upload.
* Validação de regras de negócio e isolamento de falhas de serviços externos em operações selecionadas.

**Privacidade e tratamento de dados**

* Cuidados específicos com dados potencialmente sensíveis em mensagens e descrições.
* Remoção de conteúdo de contatos e demandas dos eventos enviados ao Sentry.
* Não armazenamento de payloads de webhook do Stripe como mecanismo de persistência da aplicação.

Essas medidas fazem parte da implementação atual e não substituem uma auditoria completa de segurança, privacidade e conformidade antes de uma operação real em produção.

## Estrutura do repositório

```text
saudeconecta/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── design/
│   │   └── telas/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── analytics/
│   │   │   ├── core/
│   │   │   ├── jobs/
│   │   │   ├── models/
│   │   │   ├── routers/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   └── storage/
│   │   ├── alembic/
│   │   └── tests/
│   └── web/
│       ├── app/
│       ├── components/
│       └── lib/
├── docker-compose.dev.yml
└── README.md
```

### Organização por domínio

* `analytics/`: funções de análise e geração de relatórios.
* `core/`: configuração, autenticação, banco de dados, monitoramento e erros.
* `jobs/`: tarefas operacionais executáveis sob demanda ou agendamento.
* `models/`: modelos relacionais do SQLAlchemy.
* `routers/`: endpoints da API.
* `schemas/`: validação e serialização de dados.
* `services/`: regras de negócio, autorização e integrações.
* `storage/`: operações de armazenamento de arquivos.
* `alembic/`: migrations do banco de dados.
* `tests/`: testes automatizados do backend.
* `apps/web/`: interface web, componentes e integração com a API.

## Executando localmente

### Pré-requisitos

* Python 3.11 ou superior.
* Node.js e npm.
* Docker e Docker Compose.
* Credenciais de desenvolvimento para os serviços externos necessários.

### Backend

```bash
docker compose -f docker-compose.dev.yml up -d

cd apps/api
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt

cp .env.example .env
```

Configure as variáveis de ambiente no arquivo `.env`. A API não inicia sem estas seis: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ESSENCIAL`, `STRIPE_PRICE_PRO` e `APP_URL` (URL do frontend, usada também no CORS). As demais, como as do Supabase, Resend e Sentry, são opcionais para rodar localmente. Depois aplique as migrations:

```bash
.venv/bin/alembic upgrade head
.venv/bin/python -m pytest -q
.venv/bin/uvicorn app.main:app --reload
```

A API estará disponível em `http://localhost:8000`, com documentação interativa em `http://localhost:8000/docs`.

### Frontend

Em outro terminal:

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

Configure as variáveis de ambiente do frontend, incluindo a URL da API e as credenciais públicas do projeto Supabase correspondente.

A aplicação estará disponível em `http://localhost:3000`.

**Importante:** consulte os arquivos de exemplo e a documentação antes de executar os serviços. Nunca publique chaves privadas, segredos de webhook ou arquivos `.env` no repositório.

## Status de desenvolvimento

O MVP possui os principais fluxos funcionais implementados e integração entre frontend, backend e serviços externos. Entretanto, a conclusão de funcionalidades não significa que o produto esteja integralmente validado para operação comercial em produção.

| Área                                     | Situação                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| API e regras de negócio                  | Implementadas                                                                |
| Autenticação e perfis                    | Implementados e testados                                                     |
| Busca, contatos e avaliações             | Implementados e testados                                                     |
| Analytics com pandas                     | Implementado                                                                 |
| Assinaturas e demandas B2B               | Backend implementado; validação ponta a ponta de pagamentos ainda necessária |
| Frontend                                 | 18 rotas integradas aos principais fluxos da API                             |
| Testes automatizados                     | 243 testes de backend com PostgreSQL real                                    |
| CI                                       | Lint e testes do backend via GitHub Actions                                  |
| Deploy de demonstração                   | Frontend na Vercel e backend no Render                                       |
| Configuração de autenticação em produção | Ajustes de URLs de redirecionamento do Supabase pendentes                    |
| Preparação para produção                 | Revisões adicionais de segurança, estabilidade e configuração pendentes      |

O projeto foi desenvolvido em fases, com especificação de requisitos, planos de implementação, revisões de código e validação incremental das funcionalidades.

Documentação complementar:

* [Especificação técnica do MVP](docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md)
* [Planos de implementação](docs/superpowers/plans/)
* [Documentação do frontend](apps/web/README.md)
* [Checklist de integração](apps/web/INTEGRATION_CHECKLIST.md)
* [Status técnico detalhado](STATUS.md)

## Competências demonstradas

Este projeto reúne experiências práticas em:

* Desenvolvimento full-stack com Python, FastAPI e Next.js.
* Construção e documentação de APIs REST.
* Modelagem de dados relacionais e migrations.
* Autenticação, autorização e integração com serviços gerenciados.
* Integração de pagamentos recorrentes e webhooks.
* Testes automatizados e CI.
* Análise de dados com pandas.
* Deploy e configuração de aplicações web.
* Organização incremental do desenvolvimento e documentação técnica.

## Contato profissional

Para oportunidades profissionais, projetos de desenvolvimento de software, integrações de APIs, automação de processos e construção de MVPs:

* **LinkedIn:** [adicione aqui a URL do seu perfil]
* **Portfólio:** [adicione aqui o link do seu portfólio, se disponível]
* **Contato profissional:** [adicione aqui seu canal de contato]

---

*SaúdeConecta — um projeto de engenharia de software aplicado à construção de um produto digital para o setor de saúde.*
