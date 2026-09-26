# Telas do frontend — origem e status

Material de referência visual para a implementação de `apps/web` (Next.js), organizado
a partir do export do Google Stitch
(`stitch_saudeconecta_healthcare_marketplace_frontend (2).zip`), filtrado pelo escopo
aprovado no [design spec do Plano Básico](../../superpowers/specs/2026-09-19-saudeconecta-mvp-design.md)
mais a assinatura B2B/demandas (aprovada à parte com a cliente, já implementada em
`apps/api` na branch `feature/b2b-assinatura-demandas`).

**Isto ainda são mockups estáticos (HTML + Tailwind CDN), não código do app.** Servem de
referência visual e de contrato de conteúdo para quando `apps/web` for iniciado de
verdade (Next.js 14+ App Router + TypeScript + shadcn/ui, conforme o spec). Nenhum dos
arquivos aqui tem `fetch`/client Supabase — isso é trabalho da implementação real.

`_assets/` guarda o `DESIGN.md` (tokens de cor/tipografia/espaçamento) e as imagens de
marca exportadas junto com as telas.

## Telas mantidas do export do Stitch (15)

| Pasta | Rota sugerida (App Router) | Papel | Endpoint(s) | Pendência antes de codificar |
|---|---|---|---|---|
| `landing_sa_deconecta_hero_com_profissional_busca` | `app/(public)/page.tsx` | público | — | Nenhuma; só falta link para `/cadastro/empresa` (hoje só linka cadastro de profissional). |
| `login_entrar` | `app/(auth)/entrar` | público | Supabase Auth (fora da API) | Nenhuma. |
| `cadastro_empresa_pessoa` | `app/(auth)/cadastro/empresa` | público | Supabase Auth + `POST /auth/sync` (`papel=empresa`) | Nenhuma — campos batem com `EmpresaUpdateRequest`/`TipoEmpresa`. |
| `cadastro_profissional` | `app/(auth)/cadastro/profissional` | público | Supabase Auth + `POST /auth/sync` + `PUT /profissionais/me` | Lista de especialidades incompleta (6 de 10, hardcoded) — **priorizado depois**, ver seção de listas abaixo. Fluxo real é 2 chamadas (`/auth/sync` depois `/profissionais/me`), não uma só. |
| `home_buscar_profissionais` | `app/(public)/buscar` | público | `GET /profissionais` | Cards prometem dado que `ProfissionalSearchResult` não tem: registro profissional, distância em km, "Disponível hoje", preço por unidade (`/plantão`, `/sessão`). Ver seção de listas para as categorias de especialidade agrupadas. |
| `novo_contato` | `app/(painel)/contato/novo` | profissional/empresa | `POST /contatos` | Nenhuma. |
| `meus_contatos` | `app/(painel)/contatos` | profissional/empresa | `GET /contatos` | Nenhuma. |
| `minhas_avalia_es` | `app/(painel)/avaliacoes` | profissional/empresa | `GET /avaliacoes` | Nenhuma. |
| `meu_perfil` | `app/(painel)/perfil` | profissional/empresa | `GET/PUT /profissionais/me`, `/empresas/me`, `POST /perfis/me/avatar` | Nenhuma. |
| `detalhes_do_contato_e_avalia_o` | `app/(painel)/contatos/[id]` | profissional/empresa | `GET /contatos`, `POST /avaliacoes` | Bloco "Pagamento Realizado" depende de `POST /contatos/{id}/pagamento`, que ainda **não existe** no backend (item 8 do Plano Básico, não implementado). Tela em si está correta — sem formulário de cartão embutido. |
| `checkout_corporativo_b2b_sa_deconecta` | `app/(public)/empresa/planos` | empresa | `GET /planos`, `POST /assinaturas/checkout` | **Crítico**: refazer como resumo do plano + redirecionamento para `checkout_url` (Stripe hospedado). Remover campos de cartão/CVV/boleto/pix próprios, "múltiplos logins de equipe", "contrato gerado" — sem suporte no backend. Preço exibido (R$249/590) não tem endpoint que devolva — ver seção de listas. |
| `criar_nova_demanda` | `app/(painel)/demandas/nova` | empresa | `POST /demandas` | Remover "Tipo de Contratante" (redundante, já é `empresas.tipo`). "Serviço requerido" sem campo correspondente em `DemandaCreate` — ver seção de listas. Trocar faixa de remuneração por valor único (`valor_oferecido`). |
| `carregando_sa_deconecta` | componente `Loading` | — | — | Nenhuma. |
| `erro_404_sa_deconecta` | `app/not-found.tsx` | — | — | Nenhuma. |
| `erro_de_conex_o_sa_deconecta` | componente de erro de rede | — | — | Nenhuma. |

**Descartada:** `checkout_plano_destaque_profissional` (assinatura individual para
profissional "destacar" perfil) — sem base no spec nem no backend, fora desta rodada.

## Telas novas, criadas agora (4)

Não existiam no export do Stitch. Desenhadas seguindo o mesmo sistema visual
(`_assets/DESIGN.md`) e os schemas reais do backend — cada arquivo tem um comentário
`<!-- fonte: ... -->` no `<head>` apontando o(s) endpoint(s) exato(s).

| Pasta | Rota sugerida | Papel | Endpoint(s) | Por que faltava |
|---|---|---|---|---|
| `perfil_publico_profissional` | `app/(public)/profissional/[id]` | público | `GET /profissionais/{id}`, `GET /avaliacoes?alvo_id=` | Item 5 do Plano Básico, página explícita na fase 7 do spec — nenhuma tela do zip cobria a visão pública (só a autoedição em `meu_perfil`). A landing já linka para `/perfil/ana-silva`. |
| `oportunidades_profissional` | `app/(painel)/oportunidades` | profissional | `GET /demandas/oportunidades`, `POST /demandas/{id}/interesse` | Rota já existe e é testada no backend; nenhuma tela permitia ao profissional ver/demonstrar interesse em demandas. |
| `minhas_demandas_empresa` | `app/(painel)/demandas` | empresa | `GET /demandas/minhas`, `GET /demandas/{id}`, `PATCH /demandas/{id}` | `criar_nova_demanda` só publica; não havia tela de acompanhamento com status e interessados. |
| `minha_assinatura_empresa` | `app/(painel)/assinatura` | empresa | `GET /assinaturas/me`, `POST /assinaturas/portal` | Só havia telas de entrada (checkout); nenhuma de gestão pós-assinatura (status, uso vs. limite, portal do Stripe). |

Cada uma dessas 4 telas tem um aviso visível (`<div id... info`) documentando a
divergência de schema mais relevante que encontrei ao desenhá-la — mantive porque são
decisões reais para quem for implementar, não erros meus:

- **`perfil_publico_profissional`**: `AvaliacaoRead` devolve `autor_id` (UUID), não o
  nome de quem avaliou. Pra mostrar "Clínica Estar avaliou" de verdade, ou o backend
  precisa enriquecer a resposta, ou o frontend precisa resolver `autor_id` → nome com
  uma chamada extra por avaliação (caro) ou um endpoint em lote.
- **`oportunidades_profissional`**: `GET /demandas/oportunidades` não devolve
  `ja_demonstrei_interesse` por item (só `GET /demandas/{id}` devolve, via
  `DemandaDetalheProfissional`). Pra desabilitar o botão "Tenho interesse" direto na
  lista, precisa de uma chamada por card ou de o backend incluir o campo na listagem.
- **`minha_assinatura_empresa`**: `MinhaAssinaturaResponse`/`PlanoRead` não trazem preço
  nem lista de benefícios do plano — só `codigo`, `nome`, `limite_demandas_ativas`.

## Listas "hardcoded" nos mockups — candidatas a virar dado dinâmico

Você pediu para depois da especialidade eu conferir se há outras listas no mesmo
sentido (dado fixo no mockup que deveria vir do backend). Levantei todas:

| Lista | Onde aparece | Situação | Recomendação |
|---|---|---|---|
| **Especialidades** | `cadastro_profissional` (6/10), `criar_nova_demanda` (outras 6/10, nomes nem batem 1:1) | **Priorizado para depois, por seu pedido.** O banco já tem as 10 corretas (`GET /especialidades`); é só o mockup que está incompleto/hardcoded. | Quando implementar: buscar de `GET /especialidades`, nunca hardcodear no componente. |
| **Categorias agrupadas na busca** | `home_buscar_profissionais` — tiles "Enfermagem & Técnicos", "Médicos & Plantonistas", "Psicologia & Fono" etc. | Agrupam 2+ especialidades reais sob um rótulo que não existe no backend (`Especialidade` só tem `id`/`nome`, sem campo de categoria). | Decisão de produto: manter como mapeamento estático no frontend (mais simples, já que são só 10 itens) ou pedir um campo `categoria` em `especialidades` se a lista crescer. |
| **Benefícios por plano** | `checkout_corporativo_b2b` — "50 desbloqueios/mês", "Triagem automática por raio e escala", "Múltiplos logins" etc. | `PlanoRead` não tem campo de features/benefícios nem preço. Hoje é só texto de marketing no mockup. | Se a página de planos precisar ser dinâmica (preço/benefícios configuráveis sem redeploy), vale um campo `beneficios: list[str]` e `preco_exibicao` em `planos` — hoje o preço real só existe no Stripe. |
| **"Serviço requerido"** | `criar_nova_demanda` — "Cuidados domiciliares", "Administração de medicação", "Curativos"... | Sem campo nem tabela correspondente em `DemandaCreate`/`demandas`. | Decisão de produto: (a) descartar o campo e deixar só `descricao` livre, ou (b) criar uma tabela de referência nova (`tipos_servico`) — isso é escopo novo de backend, não é "dado faltando", é feature nova. |
| **"Turno / Horário" (presets)** | `criar_nova_demanda` — "08:00-18:00 (10h)", "19:00-07:00 (12h Noite)"... | `turno` já é texto livre no backend (`String(60)`), de propósito — o spec não pede lista fechada. | Os presets no mockup são só atalho de UX (preenchem o campo texto); não precisam virar tabela a menos que vocês queiram padronizar para filtro/relatório depois. |
| **"Tipo de Contratante"** | `cadastro_empresa_pessoa` | Já bate 1:1 com o enum Python `TipoEmpresa` (`clinica`/`hospital`/`homecare`/`pessoa_fisica`). | Nenhuma ação — só manter os dois lados sincronizados se o enum mudar. Não é uma lista faltando. |

## Próximos passos sugeridos

1. Validar com a cliente as 4 telas novas (ainda não existem em nenhum outro lugar,
   vale conferência antes de virar código).
2. Decidir os itens da tabela de listas hardcoded (especialidades fica para depois,
   como combinado; "Serviço requerido" precisa de decisão de produto antes de mexer no
   backend).
3. Iniciar `apps/web` de verdade (Next.js) seguindo a estrutura de pastas do spec,
   usando estas 19 telas como fonte de verdade de conteúdo/rota — aí sim como código.
