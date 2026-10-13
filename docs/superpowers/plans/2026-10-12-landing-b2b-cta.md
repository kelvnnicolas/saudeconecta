# Landing B2B — hero com caixas de acesso e melhorias de UI · Plano de implementação

> **Para agentes:** use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar tarefa por tarefa. Os passos usam checkbox (`- [ ]`). Leia antes o `agents.md`, o `STATUS.md` e o `nextmove.md`.

**Objetivo:** deixar a landing (`/`) mais profissional e com captação B2B mais clara. O hero passa a ser um bloco com a foto de fundo, os textos e **caixas de acesso** (cards clicáveis) que levam ao cadastro de empresa e aos acessos úteis para empresas. Entram também animações leves, menu no celular e a correção de dois bugs da landing. O design atual do projeto continua o mesmo.

**Referência:** <https://www.conexasaude.com.br/para-operadoras> (auditada em 2026-10-12, desktop 1440×900 e celular 390×844). A referência serve para **estrutura e comportamento**, não para cor, fonte ou conteúdo.

**IDs no `nextmove.md`:** F-016 a F-021, B-010, B-011, T-012, V-008, D-011 e D-012.

**Stack:** Next.js 14 (App Router), Tailwind 3 com os tokens do `tailwind.config.ts`, `MaterialIcon`. **Nenhuma dependência nova** (sem framer-motion, AOS, swiper etc.).

---

## Restrições globais

- **Essência do projeto:** roxo e verde-água da marca (`primary`, `secondary`, `#1b1238` no fundo do hero), Inter, cards com `neu-surface`, botões em pílula. Não usar o coral da referência.
- **Nada sem lastro:** sem contagem de usuários, logos de parceiros, depoimentos, métricas de resultado ou calculadora de economia (regra do projeto, ver Ideias/STATUS de 2026-10-12). Exemplos ilustrativos precisam dizer que são exemplos.
- **Animação:** só `transform` e `opacity`, de 300 a 500 ms. Com `prefers-reduced-motion: reduce` não há movimento (a regra global já existe no `globals.css`). **O hero nunca é animado na entrada**, para não atrasar o LCP.
- **Sem JavaScript o conteúdo aparece:** nada fica escondido se o script não rodar.
- **Acessibilidade:** todo card clicável é um `<Link>` ou `<a>` de verdade, com foco visível (`focus-visible:ring-2`). Abas usam `role="tablist"` e funcionam com as setas do teclado. Contraste AA sobre a foto.
- **Celular primeiro:** 390 px sem rolagem horizontal; alvos de toque com pelo menos 44 px.
- **Componentes de cliente** (`"use client"`) só onde há estado ou observer. A `page.tsx` continua sendo componente de servidor.
- **Não mexer** em API, autenticação, regras de papel (`ApenasPara`) nem na cota.

## Pontos de atenção na revisão

- **Rostos da foto do desktop.** A foto (`hero-desktop.webp`, 1672×941) tem pessoas de ponta a ponta. Hoje o degradê da esquerda para a direita (95%) apaga as duas pessoas da esquerda e o título fica sobre os rostos. O novo layout escurece **de baixo para cima** e põe o texto e as caixas no terço de baixo. Nos dois tamanhos de tela, conferir que nenhum rosto fica atrás de texto ou de card.
- **Foto do celular.** Os rostos ficam entre ~20% e 55% da altura. As caixas de acesso **não ficam em cima da foto** no celular; elas sobrepõem só a borda de baixo do hero.
- **Nenhum destino quebrado.** Todo card e botão leva a uma rota que existe: `/cadastro/empresa`, `/cadastro/profissional`, `/buscar`, `/empresa/planos`, `/entrar`, `#empresas`, `#como-funciona`.
- **Os botões de especialidade filtram de verdade** depois do B-010.
- **Sem regressão no cadastro em etapas:** o e-mail digitado em `#empresas` continua chegando preenchido em `/cadastro/empresa` (`lib/cadastro-prefill.ts`), e `?tipo=` continua selecionando o tipo.

---

## Estado de partida

- A base da landing foi feita pelo Kilo em 2026-10-12 e **ainda não tem commit**: `app/(public)/page.tsx` (hero com foto, header em pílula, captação por e-mail, cards por contratante), `components/landing/InicioCadastroEmpresa.tsx`, `lib/cadastro-prefill.ts`, mudança em `app/(auth)/cadastro/empresa/page.tsx` (lê o e-mail guardado e `?tipo=`) e `public/img/landing/hero-{desktop,mobile}.webp`.
- Originais das fotos em `imgs/` (PNG, ~2,2 MB cada, sem commit).
- O que já está pronto da referência: header em pílula translúcido, foto diferente para celular e desktop (`<picture>` + `getImageProps`), cadastro em etapas com barra de progresso.

## Estrutura de arquivos ao final

```
apps/web/app/(public)/page.tsx              # só compõe as seções
apps/web/components/landing/
  HeaderLanding.tsx        # header em pílula + menu no celular   (F-017, cliente)
  HeroLanding.tsx          # foto, textos e caixas de acesso      (F-016)
  CaixasAcesso.tsx         # cards de acesso B2B                  (F-016)
  FaixaEspecialidades.tsx  # botões de especialidade              (B-010)
  SecaoEmpresas.tsx        # já usa InicioCadastroEmpresa
  InicioCadastroEmpresa.tsx
  PerfisContratante.tsx    # cards por contratante; carrossel no celular (F-020)
  ComoFunciona.tsx         # etapas + simulação do chat           (F-019, cliente)
  ChamadaEmpresa.tsx       # faixa de CTA repetida                (F-021)
  SecaoProfissionais.tsx
  RodapeLanding.tsx        # (B-011)
  Revelar.tsx              # animação de entrada ao rolar         (F-018, cliente)
apps/web/app/globals.css                    # classes .revelar e indicadores do carrossel
apps/web/app/(public)/buscar/page.tsx       # passa a ler ?esp=   (B-010)
```

## Ordem e paralelismo

| Etapa | Tarefas | Pode rodar em paralelo? |
|---|---|---|
| 0 | Commit da base do Kilo (precisa de autorização) | — |
| 1 | Tarefa 1: extrair seções em componentes, **sem mudança visual** | Não. Todas as outras dependem dela |
| 2 | Tarefas 2 (B-010), 3 (F-016), 4 (F-017), 5 (F-018) | Sim, cada uma mexe em arquivos próprios. A tarefa 5 é a única que toca `globals.css` |
| 3 | Tarefas 6 (F-019), 7 (F-020), 8 (F-021) | Sim. 7 e 8 dependem da 5 para usar `Revelar` |
| 4 | Tarefa 9 (B-011), depois de decidido D-012 | — |
| 5 | Tarefa 10: verificação (V-008) e documentação | Por último, idealmente com revisor que não implementou |

Um commit por tarefa, com o ID na mensagem (`feat(web): F-016 hero com caixas de acesso`).

---

## Tarefa 0 · Commit da base da landing (manual, precisa de autorização)

- [ ] Rodar `npm run typecheck` e `npm run build` em `apps/web` com a base do Kilo.
- [ ] Commitar só a landing: `app/(public)/page.tsx`, `app/(auth)/cadastro/empresa/page.tsx`, `components/landing/`, `lib/cadastro-prefill.ts`, `public/img/landing/`. **Não** incluir `imgs/`, `.kilo/`, `graphify-out/` nem `agents.md` neste commit (ver T-012).
- [ ] Mensagem sugerida: `feat(web): base da landing B2B (hero com foto, captação por e-mail, cards por contratante)`.

## Tarefa 1 · Extrair as seções da landing em componentes

**Arquivos:** `app/(public)/page.tsx` e os novos `components/landing/*.tsx` listados acima (menos `CaixasAcesso`, `ComoFunciona` interativo, `ChamadaEmpresa` e `Revelar`, que nascem nas tarefas deles).

- [ ] Mover cada seção para o próprio componente, copiando JSX e constantes (`ESPECIALIDADES_LANDING`, `PERFIS_CONTRATANTE`, `PASSOS`, `CTA_PRIMARIO`, `CTA_VIDRO`) sem alterar classe nenhuma. As constantes de CTA vão para `components/landing/estilos.ts`.
- [ ] `page.tsx` só importa e compõe.
- [ ] **Aceite:** `npm run typecheck` e `npm run build` passam; captura de tela antes e depois em 390 e 1440 px é idêntica.

## Tarefa 2 · B-010 · Botões de especialidade não filtram a busca

**Causa:** os botões levam a `/buscar?esp=enfermagem`, mas `buscar/page.tsx` só lê `q`.

- [ ] Em `buscar/page.tsx`, ler `searchParams.get("esp")` e aplicar como filtro de especialidade, usando o mesmo mecanismo do filtro que a tela já tem (conferir qual parâmetro o `api.ts` envia para `GET /profissionais`). Se a API filtra por ID e não por slug, mapear o slug pela lista de especialidades que a tela já carrega.
- [ ] O filtro aparece selecionado na interface, e o usuário consegue limpar.
- [ ] **Aceite:** clicar em "Fisioterapia" na landing abre `/buscar` só com fisioterapeutas e o filtro visível; slug desconhecido é ignorado sem erro.

## Tarefa 3 · F-016 · Hero com foto, textos e caixas de acesso B2B

**Arquivos:** `HeroLanding.tsx`, `CaixasAcesso.tsx`.

**Conteúdo** (texto final pode ser ajustado, sem números):

- Selo: `Clínicas · Hospitais · Homecare · Famílias` (mantém).
- Título: mantém "O profissional de saúde **certo**, quando você precisa".
- Subtítulo: uma linha voltada a quem contrata.
- **Caixas de acesso** (3 cards, o CTA principal do hero):

| Card | Ícone | Texto | Destino |
|---|---|---|---|
| Cadastrar minha empresa | `domain_add` | Comece só com o e-mail, leva 2 minutos | `#empresas` (cadastro em etapas) |
| Buscar profissionais | `search` | Filtre por especialidade e cidade | `/buscar` |
| Planos para empresas | `workspace_premium` | Comece grátis e mude quando precisar | `/empresa/planos` |

- Abaixo das caixas, links de texto: "Sou profissional de saúde →" (`/cadastro/profissional`) e "Já tenho conta" (`/entrar`).
- O par de botões atual do hero ("Encontrar profissionais" e "Sou profissional") sai, porque as caixas cumprem esse papel.
- A frase "Comece só com o e-mail, leva 2 minutos" só entra se for verdade no teste da V-008; se não, usar "Comece só com o e-mail".

**Layout:**

- **Desktop (≥ 768 px):** foto em tela cheia, degradê **de baixo para cima** (`from-[#1b1238] via-[#1b1238]/70 via-40% to-transparent to-75%`). Texto e caixas no terço de baixo, alinhados à esquerda, `max-w-6xl`. Caixas em grade de 3 colunas, em vidro (`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-space-md`), com ícone em quadrado `bg-white/15`, título, uma linha e seta.
- **Celular:** a foto ocupa ~70svh com título, subtítulo e selo sobre o degradê. As caixas **saem da foto**: lista vertical sobre o fundo `surface`, cards `neu-surface` brancos, sobrepondo 48 px a borda de baixo do hero (`-mt-12 relative z-10`). Card com ícone à esquerda, texto e seta à direita, altura ≥ 64 px.
- A faixa de especialidades sai de dentro do hero e vira `FaixaEspecialidades`, logo abaixo das caixas.

**Interação:** no hover (só com `@media (hover: hover)`), o card sobe 2 px (`-translate-y-0.5`), fica um pouco mais claro e a seta anda 4 px. Foco com `ring-2 ring-white` no desktop e `ring-primary` no celular. Sem animação de entrada.

- [ ] Implementar os dois componentes.
- [ ] **Aceite:** em 390, 768, 1024 e 1440 px, nenhum rosto atrás de texto ou card; as 3 caixas e os 2 links levam às rotas certas; contraste AA dos textos sobre a foto; Tab percorre as caixas na ordem visual.

## Tarefa 4 · F-017 · Header no celular com CTA e menu

**Problema:** abaixo de `sm`, o botão "Cadastrar empresa" some e não há menu; "Para empresas", "Para profissionais" e "Como funciona" ficam inacessíveis.

- [ ] `HeaderLanding.tsx` vira componente de cliente. No celular: logo, botão compacto "Para empresas" (`#empresas`) e botão de menu (`menu` / `close`, `aria-expanded`, `aria-controls`).
- [ ] O menu abre como painel abaixo da pílula, com os 3 links de âncora, "Entrar" e "Cadastrar empresa". Fecha com Esc, clique fora ou clique num link. O foco vai para o primeiro link ao abrir e volta ao botão ao fechar.
- [ ] Ao rolar além do hero, a pílula fica um pouco mais opaca (`bg-surface/95` + sombra maior). Usar um observer no fim do hero, não um listener de scroll a cada frame.
- [ ] **Aceite:** em 390 px dá para chegar a todas as seções e ao cadastro pelo header; teclado e leitor de tela funcionam.

## Tarefa 5 · F-018 · Animação de entrada ao rolar

- [ ] `Revelar.tsx` (cliente): envolve o conteúdo, usa `IntersectionObserver` (`threshold: 0.15`, `rootMargin: "0px 0px -10% 0px"`), marca `data-visivel` uma vez e desconecta. Aceita `atraso` em ms para escalonar cards (máximo 3 por grupo, passos de 80 ms).
- [ ] CSS em `globals.css`: `.revelar { opacity: 0; transform: translateY(24px); transition: opacity .5s ease, transform .5s ease }` e `.revelar[data-visivel] { opacity: 1; transform: none }`. **Só aplicar o estado escondido quando o JS estiver ativo** (classe `js` no `<html>` adicionada por script inline no `layout.tsx`, ou o componente só adiciona `.revelar` depois de montar).
- [ ] Sem `IntersectionObserver`, mostra direto. Com `prefers-reduced-motion: reduce`, sem transform e sem transição.
- [ ] Aplicar em: títulos de seção, `SecaoEmpresas`, cards de `PerfisContratante`, `ComoFunciona` e `SecaoProfissionais`. **Nunca** no hero nem no header.
- [ ] **Aceite:** com JS desligado, tudo visível; reduced-motion sem movimento; nenhum salto de layout (CLS ≈ 0).

## Tarefa 6 · F-019 · "Como funciona" com simulação do chat

Na referência, a jornada em etapas fixa na tela com uma conversa simulada é o recurso mais forte. Aqui ela mostra o fluxo **real** do app: busca, conversa com aceite (feature de 2026-09-29) e avaliação.

- [ ] `ComoFunciona.tsx` (cliente). À esquerda, 3 etapas como abas (`role="tablist"`, setas do teclado): **Busque**, **Converse e combine**, **Avalie**. A aba ativa mostra a descrição; as outras ficam recolhidas. À direita, um painel em "tela de celular" que troca conforme a aba:
  1. **Busque:** dois cards de profissional no estilo do `ProfessionalCard` (sem importar o componente real nem chamar a API).
  2. **Converse e combine:** 3 ou 4 balões de chat (empresa ↔ profissional) e o botão "Aceitar" como no contato real.
  3. **Avalie:** 5 estrelas e um comentário curto.
- [ ] Nomes e textos fictícios, com legenda discreta "Exemplo ilustrativo". Sem foto de pessoa real; usar iniciais.
- [ ] Desktop: duas colunas. Celular: abas em cima (pílulas roláveis) e painel embaixo. Troca de painel com fade de 200 ms (sem fade em reduced-motion). **Sem troca automática.**
- [ ] CTA ao fim: "Cadastrar minha empresa" (`#empresas`).
- [ ] **Aceite:** teclado funciona; o painel tem `aria-live="polite"` ou é ligado à aba por `aria-labelledby`; nada é carregado da API.

## Tarefa 7 · F-020 · Cards por contratante em carrossel no celular

- [ ] Em `PerfisContratante.tsx`, abaixo de `sm`: trilho horizontal com `snap-x snap-mandatory`, cards com `w-[85%]` mostrando a pontinha do próximo, `no-scrollbar`.
- [ ] Indicador em pílula (o ativo é alongado, como na referência) ligado a um `IntersectionObserver` por card. Os indicadores são botões que rolam até o card (`aria-label="Ir para Hospitais"`).
- [ ] A partir de `sm`, a grade atual continua igual.
- [ ] **Aceite:** em 390 px, deslizar troca o indicador; tocar no indicador rola até o card; não há rolagem horizontal da página.

## Tarefa 8 · F-021 · Chamada para empresas repetida

- [ ] `ChamadaEmpresa.tsx`: faixa curta (`rounded-2xl`, fundo `primary-fixed`) com uma frase e o botão pílula "Cadastrar minha empresa" → `#empresas`.
- [ ] Colocar depois de `PerfisContratante` e depois de `ComoFunciona` (se a tarefa 6 já tiver o CTA próprio, só depois de `PerfisContratante`). No máximo duas na página.
- [ ] **Aceite:** todas levam ao mesmo formulário; texto sem promessa sem lastro.

## Tarefa 9 · B-011 · Rodapé com links para páginas que não existem

`/sobre`, `/contato`, `/ajuda`, `/seguranca`, `/privacidade` e `/termos` dão 404. **Depende de D-012.**

- [ ] Se D-012 = remover: deixar só links que existem (`/empresa/planos`, `/cadastro/profissional`, `/entrar`) e o e-mail de contato.
- [ ] Se D-012 = criar: páginas estáticas simples em `app/(public)/`, com o texto jurídico fornecido pela cliente (o agente não escreve termos nem política de privacidade por conta própria).
- [ ] **Aceite:** nenhum link do rodapé dá 404.

## Tarefa 10 · Verificação e documentação (V-008)

- [ ] `npm run typecheck` e `npm run build` em `apps/web`. O lint não roda sem configuração (T-001); registrar isso.
- [ ] Capturas com Playwright em 390×844, 768×1024 e 1440×900: hero, caixas, menu aberto, Como funciona (3 abas), carrossel.
- [ ] Teclado: Tab do header até o rodapé, menu com Esc, abas com setas.
- [ ] Emulação de `prefers-reduced-motion: reduce` e de JS desligado.
- [ ] Lighthouse no celular: anotar LCP e CLS antes e depois. A mudança não pode piorar o LCP.
- [ ] Conferir cada destino de card e link.
- [ ] Atualizar `STATUS.md` (uma linha por ID, com commit) e apagar os itens do `nextmove.md`.

---

## Fora do escopo (avaliado e descartado por enquanto)

| Recurso da referência | Motivo |
|---|---|
| Calculadora de economia com controle deslizante | Números sem lastro. Alternativa futura: simulador de plano com os preços reais (Ideias) |
| Depoimentos, logos de parceiros, "+35 milhões de vidas" | Sem dados reais ainda |
| Faixa de logos em rolagem automática | Substituída pelos botões de especialidade |
| Barra "Alerta de golpe", card "Novidade" fixo | Não se aplica |
| Widget de acessibilidade de terceiros | Script externo; acessibilidade é resolvida no próprio código |
| Banner de cookies | Só passa a ser necessário se entrar ferramenta de analytics ou pixel |
| Coral `#EF4465` e fonte Sora | Fora da identidade do projeto |
