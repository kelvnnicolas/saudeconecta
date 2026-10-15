# Status do projeto — SaúdeConecta

> **Função:** registro do que já foi feito e do estado atual verificado. Serve para retomar o projeto.
> **Não guarda tarefas pendentes.** O que fazer a seguir está no [`nextmove.md`](nextmove.md).

**Última atualização:** 2026-10-12 · `main` com 153 commits, igual ao `origin` (PR #37 mergeado em 2026-10-13, merge `3706e00`)
**Produção:** frontend <https://saudeconecta-pi.vercel.app> · API <https://saudeconecta-api.onrender.com> (free tier: ~15 s no primeiro request depois de ociosidade)

## Como manter este arquivo

- Ao concluir um item do `nextmove.md`, adicione **uma linha** no [Registro de entregas](#registro-de-entregas) com o ID e o commit ou PR, e apague o item de lá.
- Atualize [Estado atual](#estado-atual) só quando algo mudar de estado.
- Marque ✅ só o que foi verificado (teste rodado ou testado ao vivo).
- Decisão que vale para o projeto todo vai em [Decisões registradas](#decisões-registradas).

**Legenda:** ✅ verificado · 🟡 pronto, sem verificação recente · ❌ não feito · ⏸️ adiado por decisão

---

## Estado atual

| Área | Estado | Observação |
|---|---|---|
| Backend (FastAPI) | ✅ Produção (Render) | Spec do MVP, assinatura B2B, demandas, chat, aceite, notificações, diretório de empresas, regras de contato e cota mensal (plano gratuito, Essencial, Pro). Único item do spec fora: link de pagamento por contato (⏸️). |
| Frontend (Next.js) | ✅ Produção (Vercel) | App Router + Supabase Auth (e-mail, Google). LinkedIn com código pronto, falta config externa. |
| Testes do backend | ✅ | 285 passando em 2026-10-12 (suíte inteira, PostgreSQL real), com Black e Ruff limpos. |
| Testes do frontend | ❌ | Sem suíte. CI não roda `tsc` nem lint do `apps/web`. |
| CI | ✅ | GitHub Actions a cada PR e push na `main`. |
| Deploy | ✅ | Render com auto-deploy por commit (desde 2026-10-12). Vercel por push. |
| Stripe | 🟡 | Checkout validado só em modo de teste, em conta que não é a definitiva. |
| Dependências | 🟡 | Dependabot ativo, com PRs de atualização abertos no `origin`. |

### Critérios de aceite do MVP

| Critério | Estado | Observação |
|---|---|---|
| Backend e frontend rodam localmente | ✅ | |
| Cadastro e login para os dois papéis | ✅ | E-mail e Google. LinkedIn depende de config externa. |
| Busca com texto e filtros | ✅ | `/buscar` |
| Upload de foto/logo | 🟡 | Endpoint usado pela UI; Storage real não reconfirmado. |
| Perfil público com avaliações | ✅ | |
| Contato registra mensagem e envia e-mail | ✅ | Mais chat completo (2026-09-29). |
| Link de pagamento abre checkout válido | ⏸️ | Ver decisão 12. |
| Relatório pandas | ✅ | `GET /analytics/relatorio` |
| Erro forçado aparece no Sentry | 🟡 | Código pronto, não reconfirmado. |
| CI passa | ✅ | |
| Layout responsivo | ✅ | Viewport mobile; zoom do iOS corrigido em 2026-10-12. |
| README permite rodar do zero | ✅ | |

### Prontidão para produção

| Item | Estado | Observação |
|---|---|---|
| Configuração validada na inicialização | ✅ | Falha rápido listando só os nomes das variáveis. |
| Segredos fora do Git | ✅ | |
| Migrations com rollback testado | ✅ | `tests/test_migrations.py` |
| Acesso a dados via ORM | ✅ | Sem SQL cru com input de usuário. |
| Autenticação e autorização | ✅ | JWT via JWKS; regras na camada de serviço. RLS nas tabelas novas; `contatos` e tabelas antigas sem RLS (decisão 1). |
| Webhook de pagamento seguro | ✅ | HMAC no corpo bruto, idempotência. |
| LGPD no Sentry | ✅ | `descricao`/`mensagem` filtradas. |
| CORS | ✅ | Origem única (`app_url`). |
| Rate limiting | ✅ | PR #12 e PR #25 (`/empresas`), mergeados com CI verde. |
| Health check com banco (`/ready`) | ✅ | PR #12 |
| Split de dependências prod/dev | ✅ | PR #12 |
| Job de expiração de demandas | 🟡 | Workflow diário via GitHub Actions (PR #12). Depende do secret `PROD_DATABASE_URL`; não verificado se já foi configurado. |
| Convenção de nomes de constraints | ⏸️ | Adiado desde o Plano 1. |

---

## Registro de entregas

Mais recente primeiro. Uma linha por entrega; IDs referem-se ao `nextmove.md`.

### 2026-10-15
- **Aceite de demanda direta sem corrida** (T-002, branch `fix/aceite-idempotente`, sem push): duas requisições de aceite do mesmo profissional ao mesmo tempo podiam sobrescrever a data do aceite e mandar duas notificações e dois e-mails à empresa. O aceite agora é um único `UPDATE ... WHERE aceito_em IS NULL`; só quem grava notifica, e a outra recebe o estado atual. Teste novo `test_aceite_simultaneo_notifica_so_uma_vez` (simula a leitura desatualizada; viu falhar antes da correção), 288 testes do backend passam, `ruff` e `black` limpos. Só backend, sem migration. **Não provado com concorrência real** (threads contra o Postgres): a garantia vem da atomicidade do `UPDATE`.

### 2026-10-14
- **Especialidades vindas da API** (T-019, branch `fix/especialidades-da-api`, sem push): as telas de nova demanda e de cadastro de profissional deixaram de usar a lista fixa de 6 e leem `GET /especialidades` (as 10 cadastradas) por `lib/use-especialidades.ts`, com uma busca por carga da página e mensagem se falhar. `lib/mock-data.ts` removido; README e checklist atualizados. Conferido no navegador (10 especialidades no cadastro), `typecheck` e `build`; **não conferi** a tela de nova demanda logada nem o estado de erro.
- **Paleta com mais identidade** (branch `feat/aviso-limite-plano`): roxo da marca `#642FD9` (era `#6D3FD1`; contraste 7,1:1 com texto branco), teal `#0F766E` para texto e ícone e `#14B8A6` só para preenchimento e indicador (`--secondary-fill`), no escuro `#2DD4BF`. O roxo ficou em botão principal, logo e estado ativo; selos, avatares e fundos informativos (perfil do profissional, lista de contatos, "Como funciona", perfis da landing) passaram para teal ou neutro. O vidro ganhou reflexo de luz no topo e uma curva de mola suave (`--mola`) em botão de destaque, relevo e entrada ao rolar, todos desligados com `prefers-reduced-motion`. O azul funcional ficou **de fora** desta rodada. Conferido no navegador (claro e escuro, 390 px), `typecheck` e `build`; **não medi** contraste de todas as telas logadas nem validei em aparelho real.
- **Aviso de limite antes do formulário** (b93ede5, mesma branch): corrige o primeiro desenho do aviso, que ficava no fim do formulário e só era descoberto depois de preencher tudo. Agora o aviso fica logo abaixo do título, os campos ficam esmaecidos e desativados (`CamposDoFormulario`) e, na lista de demandas, o botão com cadeado abre um popup (`ModalLimite`: Esc, clique fora, foco preso e devolvido, rolagem travada) em vez de levar a um formulário que seria recusado. Verificado no navegador com respostas simuladas e `build`/`typecheck`; **não verificado** com leitor de tela nem em produção.
- **Aviso de limite mensal** (8424737, branch `feat/aviso-limite-plano`, empilhada sobre o PR #38, sem merge): componente `AvisoLimite` com cadeado que diz o que acabou, mostra o benefício de assinar (números dos planos vindos da API), dá ação principal ("Conhecer os planos", ou "Gerenciar assinatura" para quem já assina) e uma saída ("Ver minhas demandas" ou "Ver meus contatos") e informa quando renova ("1º de novembro"). O botão de enviar fica travado com cadeado e o aviso vem antes dos campos. Cobre pagamento pendente (402) e recusa do servidor (409) depois da consulta. Aplicado em nova demanda, novo contato, assinatura, perfil do profissional (o botão de contato vira barra travada) e no botão + da lista de demandas. Texto em `lib/limite-plano.ts` com 14 verificações em Node; telas conferidas no navegador com respostas simuladas (gratuito, Essencial, pagamento pendente, 409 do servidor, perto do limite; claro e escuro, 390 px); `typecheck` e `build` passam. **Não verificado:** o fluxo real em produção e leitor de tela.
- **B-001** (causa encontrada e corrigida, na branch `fix/criar-demanda`, ainda sem merge): o erro "só empresas do tipo… podem assinar e publicar demandas" vinha de `obter_empresa_elegivel`, que só aceitava clínica, hospital e homecare e barrava **pessoa física e família**. Agora todo perfil de empresa com cadastro completo publica e assina sob as regras de plano (291938b). 287 testes do backend passando; a conta de pessoa física recebeu "1 de 5" no plano gratuito. **Não validado em produção**: não publiquei uma demanda de verdade, porque o banco local é o de produção.
- Tela de criar demanda (564ba7a): chips de sugestão invisíveis (tokens `surface-container-*` têm a cor do fundo) agora têm relevo; campo de data com altura, alinhamento e ícone corretos nos dois temas, cinza quando vazio e sem datas passadas; campos com foco visível; rodapé descreve o limite do plano. Cartões e balões do "Como funciona" da landing com tom visível. Verificado no navegador (claro e escuro, 390 px) e `tsc`; sem `build` de produção desta vez.

### 2026-10-13
- **PR #37 mergeado** (`3706e00`): landing B2B, entrada única, regra de vidro e fonte de ícones local. Checks verdes (backend e Vercel). Em produção: landing nova, fonte local (462.304 bytes) e rotas `/entrar`, `/buscar`, `/empresa/planos` e cadastros com 200; API com `/health` 200 e `/planos` com `limite_mensal`. Falta validar com contas reais (V-006, V-007) e o que a verificação não cobriu: conta de profissional logada na landing e login com conta do tipo errado.

### 2026-10-12
- **T-016** Fonte de ícones hospedada no projeto (693472b; PR #37): arquivo em `public/fonts/` com só os eixos usados (peso 400 e preenchimento 0..1), de 3,9 MB para 451 kB, sem CSS externo bloqueando e sem requisição ao Google. Lighthouse no celular (3 rodadas cada): FCP de ~22 s (ou 1,6 s nas rodadas boas) para **0,8 s em todas**; nota de 55 (ou 90) para **76 a 79 estável**; CLS 0. Testado também sem o `preload`: pior (FCP 3,2 s), então ficou com. **Não resolvido:** o LCP simulado continua em ~5,4 s (T-017). Ícones conferidos na landing e em `/perfil`, incluindo o preenchido (estrelas).
- **Landing B2B, tarefas 6 a 10 do plano** (PR #37): **F-019** "Como funciona" em abas com simulação do chat (1d18452); **F-020** carrossel por contratante no celular (b9eb093); **F-021** faixa de chamada para empresas (ac1323f); **B-011** rodapé só com links que existem (d09ea8c, opção "remover" da D-012 aplicada provisoriamente); **V-008** verificação e correções (493eb5c). Verificado em build de produção: `typecheck` e `build` passam; teclado (ordem do Tab sem elementos sem nome, abas com setas, Home e End); movimento reduzido real emulado (0 elementos escondidos); HTML do servidor com todo o conteúdo e sem estado escondido; 8 rotas e 2 âncoras sem 404; sem rolagem horizontal em 390, 360 e 320 px. **Lighthouse (celular, 3 rodadas):** CLS de 0,049 para 0,000 depois da correção; LCP igual ao da `main` nas rodadas lentas (cerca de 23 s nos dois lados, por causa da fonte de ícones, T-016) e 3,5 s com nota 90 quando a fonte responde rápido. **Não verificado:** conta de profissional logada na landing; JavaScript realmente desligado (só o HTML do servidor foi inspecionado).
- **Ajustes de vidro, navbar e entrada** (0a63ee2, b1de5b7; PR #37): regra universal de vidro em `docs/decisions/0001-regra-de-vidro.md` (três famílias nos dois temas); navbar só com marca, "Como funciona?" e "Entre para começar" (menu apenas logado); hero sem selo de verificado e sem links e faixa duplicados, e no celular as caixas ficam sobre fundo escuro (sem cartão branco sobre foto); `/entrar` separa profissional de empresa (escolha lembrada), confere o tipo da conta e, com credencial recusada, oferece criar conta do tipo escolhido; "Entrar" nas telas públicas; Header e navegação inferior em vidro. Verificado: `typecheck` e `build` passam; visitante testado em contexto isolado (Playwright) em 390, 360, 320 e 1440 px, claro e escuro. **Não verificado:** login real com conta do tipo errado (só a recusa de credencial foi simulada). Os dois temas foram mantidos: depois da regra, ambos ficaram consistentes.
- **Landing B2B, tarefas 0 a 5 do plano** (PR #37): base do Kilo comitada (b09deae); seções extraídas em componentes com HTML renderizado idêntico byte a byte (513ab71); **B-010** busca lê `?esp=` (fd455d5); **F-016** hero com caixas de acesso, rostos livres em 390/768/1024/1440 px (bae1927); **F-017** header com menu no celular e até 1023 px (9e3fde0); **F-018** entrada ao rolar com `Revelar`, CLS medido 0 (5a35812). Verificado: `npm run typecheck` e `npm run build` passam; comportamento do menu, destinos dos links e ausência de rolagem horizontal conferidos no navegador. **Não verificado:** movimento reduzido real do sistema (só simulado), Lighthouse e teclado completo do header ao rodapé (V-008, tarefa 10 do plano). Tarefas 6 a 10 (F-019, F-020, F-021, B-011, V-008) seguem abertas.
- Landing B2B, auditoria e plano (sem commit ainda): landing comparada com a referência da Conexa Saúde (desktop e celular) e plano de implementação em `docs/superpowers/plans/2026-10-12-landing-b2b-cta.md`. Itens abertos no `nextmove.md`: F-016 a F-021, B-010, B-011, T-012, V-008, D-011, D-012. Descartados por falta de lastro: calculadora de economia, depoimentos, logos de parceiros e contadores.
- **F-012** Uso da cota mensal em `/contato/novo` e `/demandas/nova` (d40bb9c): barra "N de M neste mês", aviso a partir de 80%, e com a cota esgotada mensagem com atalho para os planos e envio desativado. Plano ilimitado não mostra nada.
- **B-002** Auditoria de acesso por ID (440f793): todas as rotas com ID têm teste com dois usuários (contatos, mensagens, aceite, demandas, interesse, notificações). Demandas e notificações já negavam corretamente; contatos respondiam 403 para contato alheio e 404 para inexistente, o que revelava quais IDs sequenciais existem. Agora os dois dão o mesmo 404. Nenhum vazamento de dados foi encontrado.
- Registro profissional opcional no cadastro, até a validação ser definida (commit mais recente da `main`); mensagem de especialidades deixou de aparecer como "Required".
- **F-002** Segurança de senha (813251a): senha forte (8+ caracteres, maiúscula, minúscula, número e símbolo) com checklist do que falta, campo de confirmação nos dois cadastros e em `/entrar/nova-senha`, botão mostrar/ocultar em todos os campos de senha. Regra em `lib/validations/senha.ts`.
- "Esqueceu a senha?" abaixo do campo de senha do login, maior, sublinhado e com ícone (813251a).
- Erros do Supabase Auth traduzidos para português no login, cadastro e login social (813251a).
- Profissional não cria demanda: verificado que a API recusa (403) e que nenhuma tela leva a `/demandas/nova` para esse papel (barreira por papel e CTA de empresa escondido); ver decisão 17.
- **F-011** Regras de contato e cota mensal: só empresa inicia contato com profissional; cota única de contatos + demandas por mês (gratuito 5, Essencial 50, Pro ilimitado) (1be9bc7, f20bff8). Em produção desde 2026-10-12; falta validar com contas reais (V-006, V-007). Migration `a1d4e7b92c30` aplicada no Supabase de produção em 2026-10-12.
- Telas barradas por papel (`ApenasPara`) e erros da API traduzidos para o usuário (rede, 401, 429, 5xx, validação); mensagens do backend sem jargão (28df8e0, 197a322).
- **B-006** verificado e fechado: o único controle de tema está em `/perfil`; nenhuma outra tela tem o ícone de modo escuro.
- **F-001** Diretório de empresas para profissionais: API com `demandas_abertas` (31a970e) e tela `/empresas` (6812eb5). Em produção desde 2026-10-12; falta validar com conta de profissional (V-006).
- Confirmação de saída com dados não salvos na nova demanda (aead41b) e no novo contato (927cfc6); hook `useAvisoAoSair`.
- Campos com 16 px no mobile para evitar zoom automático do iOS (1e1b13e).
- Removida a contagem fixa "mais de 1.400 profissionais" (a56c486) e o texto sem lastro do CTA de contatos (5ad7820).
- Cores do tema aceitam modificador de opacidade (aa4baf2).
- README reformatado e afirmações corrigidas (d874afb).
- Render passou a fazer auto-deploy por commit.

### 2026-10-05
- Fluxo de recuperação de senha `/entrar/esqueci-senha` → `/entrar/nova-senha`, e leitura dos erros de validação do FastAPI (06f58e7).
- Estado e cidade escolhidos em lista no cadastro e na demanda (4108c26); trim de cidade no match de demandas (37ed52f).
- Sino de notificações fecha com clique fora ou Esc e marca todas como lidas (d83c657).
- Skeletons no lugar de spinners (2cb12b7); respeito a `prefers-reduced-motion` (2410412).

### 2026-10-01
- Links de checkout, portal e falha de pagamento apontam para `/assinatura` (1e716cb).

### 2026-09-30
- Notificações no app: tabela `notificacoes`, `GET/POST /notificacoes`, eventos de novo contato, nova mensagem, aceite, novo interesse, falha de pagamento e demanda publicada para profissionais compatíveis; sino em todas as telas do painel (f0937db … db6ae42).
- Mergeados: PR #11 (chat + aceite), PR #12 (rate limiting, `/ready`, Dependabot, split de deps, cron de expiração), PR #13 (`GET /empresas`), PR #25 (rate limit em `/empresas`).

### 2026-09-29
- Chat e aceite de demanda direta dentro do Contato: `mensagens_contato`, `Contato.aceito_em`, `GET/POST /contatos/{id}/mensagens`, `POST /contatos/{id}/aceitar`. Spec em `docs/superpowers/specs/2026-09-29-chat-aceite-demanda-direta-design.md`.
- Correções: código cru `nao_elegivel` no checkout, portal e interesse (PR #8); pinch-zoom (PR #9); tema movido para o Perfil, padrão claro (PR #7); "Nome da família" opcional (PR #6).

### Até 2026-09-28
- Backend do MVP (Planos 1 a 5), assinatura B2B e demandas, frontend completo na Vercel, login com Google e Facebook (PR #5), polish de design (PR #3). Detalhes no histórico do Git até 688d05c.

---

## Decisões registradas

Decisões técnicas e de produto já tomadas. Decisões **em aberto** ficam no `nextmove.md`.

1. **RLS**: o projeto não tinha padrão de RLS (decisão documentada: autorização na
   camada de serviço, API conectando como o role dono das tabelas). Nas 4
   tabelas novas o RLS foi **ativado** — o dono ignora RLS, então a API não é
   afetada, mas o acesso direto via PostgREST (`anon`/`authenticated`) fica
   bloqueado se o banco for o do Supabase. As policies de leitura de
   `demandas` só são criadas onde o schema `auth` existe (Supabase), porque o
   Postgres local/CI não tem `auth.uid()`; o SQL delas foi validado num banco
   descartável simulando esse schema, mas nenhum teste automatizado o exercita.
   A policy de profissional consulta `profiles`: se `profiles` ganhar RLS um
   dia, ela precisa ser revista. As tabelas antigas (inclusive `contatos`, que
   agora também guarda mensagens de interesse) continuam **sem** RLS — risco
   pré-existente, fora do escopo desta etapa.
2. **Checkout abandonado**: uma linha `incomplete` sem subscription (usuário fechou
   o Checkout) nunca é encerrada por webhook — pela spec literal a empresa ficaria
   bloqueada com 409 para sempre. O checkout reaproveita essa linha; o 409 vale
   quando já existe subscription real.
3. **Limites dos planos** (não definidos na spec): `essencial` = 5 demandas
   abertas, `pro` = ilimitado. **Substituída pela decisão 15** (cota mensal).
4. **`STRIPE_SECRET_KEY`** também passou a falhar rápido (sem ela nenhuma
   rota de assinatura funciona). A mensagem de erro de boot lista só os
   **nomes** das variáveis — a mensagem padrão do Pydantic incluiria os valores
   (inclusive segredos) no log.
5. **E-mail de falha de pagamento** aponta para `APP_URL/assinatura` (antes apontava para `/empresa/assinatura`, rota que nunca existiu; corrigido em 1e716cb), não
   para uma sessão do Portal: sessões do Portal expiram em minutos e não servem
   num e-mail. A página do frontend chama `POST /assinaturas/portal`.
6. **Contato por demanda**: `solicitante_id` = empresa dona, `profissional_id` =
   profissional interessado; `mensagem` = texto opcional do profissional ou um
   padrão. Assim aparece em `GET /contatos` para os dois e libera avaliação.
7. **API do Stripe**: SDK `stripe==15.6.1` fixa a versão `2026-08-26.dahlia`.
   Nela, `current_period_end` fica nos **itens** da subscription, e é de lá que
   o código lê. `invoice.payment_failed` identifica a empresa pelo `customer`
   da invoice (estável entre versões).
8. **Sentry/LGPD**: além do `before_send` pedido, `before_send_transaction` também
   filtra, e a captura de variáveis locais foi desligada por completo. A revisão
   independente achou um vazamento que o teste original não cobria: o texto de
   erros do banco (o próprio Postgres cita valores, ex. `Failing row contains
   (...)`) levava `descricao`/`mensagem` ao Sentry e ao log do uvicorn. Corrigido
   com `hide_parameters`, filtro da mensagem de qualquer erro SQL no Sentry e um
   tratador que devolve 500 genérico e loga só o tipo do erro.
9. **Webhook — erros permanentes respondem 200** (desvio do item 6.2.7): eventos
   que nunca vão se aplicar (subscription duplicada, subscription sem assinatura
   local) são gravados em `eventos_stripe.erro`, alertados no Sentry e respondidos
   com 200 — com 500 o Stripe reenviaria por dias sem chance de sucesso. Erros
   transitórios (Stripe/banco fora do ar) continuam 500 para o Stripe reenviar.
10. **Checkout nunca deixa duas sessões pagáveis**: antes de criar uma sessão nova,
    a anterior ainda aberta é expirada; se ela já foi paga, responde 409
    `assinatura_em_processamento`. Sem isso a empresa podia ser cobrada duas vezes.
11. **Códigos de erro adicionais** (além dos da seção 7): `plano_inexistente`,
    `assinatura_existente`, `assinatura_em_processamento`, `assinatura_inexistente`,
    `stripe_indisponivel` (502), `apenas_empresas`, `apenas_profissionais`,
    `demanda_inexistente`, `especialidade_inexistente`, `transicao_invalida`,
    `interesse_existente`, `demanda_indisponivel` (410),
    `perfil_profissional_incompleto`, `assinatura_webhook_invalida`,
    `perfil_nao_concluido`, `limite_atingido` (409), `pagamento_pendente` (402).
    `assinatura_necessaria` deixou de existir (decisão 15).
12. **Link de pagamento por contato adiado** (item 9 do spec): chat + aceite de demanda direta (2026-09-29) cobre o mesmo gatilho sem depender de pagamento.
13. **Job de expiração via GitHub Actions**: o Cron Job do Render não tem tier grátis. As leituras já tratam demanda vencida como expirada, então o job falhar não afeta o site.
14. **Diretório de empresas v1** sem contato direto nem nota: mostra nome, cidade, tipo e demandas abertas, para não expor empresas que não demonstraram interesse.
15. **Contato e cota mensal** (2026-10-12): só empresas (qualquer tipo, inclusive pessoa
    física) iniciam contato com profissionais; profissionais só respondem e demonstram
    interesse em demandas. Cota **única** somando contatos iniciados (origem `busca`) e
    demandas publicadas, por **mês de calendário em UTC**: gratuito 5, Essencial 50
    (`planos.limite_mensal`), Pro ilimitado (`NULL`). Gratuito = sem assinatura ou com
    assinatura sem efeito (`incomplete`, `unpaid`, `paused`, `canceled`). `past_due`
    bloqueia contato e demanda (402). Interesse recebido de profissionais **não** gasta
    cota. Encerrar ou expirar uma demanda não devolve cota (conta a publicação).
    Publicar demanda deixou de exigir assinatura. (Pessoa física passou a poder publicar e assinar; ver decisão 25.) A trava de concorrência é na linha da `empresas`, porque no plano gratuito não
    há linha de assinatura para travar.
16. **Migration aditiva da cota**: `planos.limite_mensal` foi adicionada sem remover
    `limite_demandas_ativas`, porque o Render não roda migrations no deploy e o banco local
    de desenvolvimento é o de produção. Assim o código antigo e o novo convivem entre a
    migration e o deploy.
17. **Telas por papel**: cada rota restrita tem `layout.tsx` com `ApenasPara`, e quem está no
    papel errado vai para a tela inicial do próprio papel, sem chamar a API. Telas de
    profissional: `/empresas`, `/oportunidades`, `/avaliacoes`. De empresa: `/demandas`,
    `/demandas/nova`, `/assinatura`, `/empresa/planos` (visitante pode ver os planos),
    `/contato/novo`.
18. **Senha**: regra de criação e troca é 8+ caracteres com maiúscula, minúscula, número e
    símbolo, validada no cliente. O login não aplica a regra, porque contas antigas podem ter
    senha mais fraca. A política equivalente no servidor (Supabase) está pendente, ver T-010
    no `nextmove.md`.
19. **Registro profissional opcional**: o campo existe no cadastro e no perfil, mas não é
    obrigatório nem validado. Não há selo de "registro verificado" até a validação ser
    definida (F-015 e D-009 no `nextmove.md`).
20. **Contato alheio responde 404**: quem não é parte de um contato recebe o mesmo 404
    `contato_inexistente` de um ID que não existe (o código `nao_participante` deixou de
    existir). Vale para mensagens, envio de mensagem e aceite.
21. **Regra de vidro**: barras, botões e cartões que flutuam usam `.vidro`, `.vidro-midia`/`.vidro-midia-denso` ou `.vidro-acento`, com variáveis `--vidro-*` por tema; nunca branco opaco sobre mídia escura. Texto sobre foto é branco com degradê por baixo. Detalhes em `docs/decisions/0001-regra-de-vidro.md`.
22. **Entrada única**: não há botão de cadastro nas barras; quem não tem conta entra por "Entrar" e escolhe o tipo (profissional ou empresa) em `/entrar`. O Supabase não revela se um e-mail existe, então "validar o cadastro" é: credencial recusada oferece criar conta do tipo escolhido, e conta de outro tipo é avisada e a opção ajustada.
23. **Rodapé da landing (D-012, provisório)**: ficam só links para páginas que existem. Sobre, Contato, Ajuda, Segurança, Privacidade e Termos voltam quando houver texto; termos jurídicos não são escritos pelo agente. Reabrir a decisão quando houver o conteúdo.
24. **Fonte de ícones local**: o Material Symbols é servido de `public/fonts/` (Apache 2.0), não mais do Google Fonts. Ganha desempenho e deixa de enviar o IP dos visitantes a um terceiro (LGPD). Para mudar eixos ou ícones, baixe outro arquivo e meça de novo com o Lighthouse; o `@font-face` e a classe `.material-symbols-outlined` estão em `app/globals.css`.
25. **Pessoa física e família publicam e assinam** (2026-10-14): qualquer perfil de empresa com cadastro completo é elegível a publicar demanda, assinar e abrir o portal, sob as mesmas regras de plano (cota mensal: gratuito 5, Essencial 50, Pro ilimitado). Substitui a parte da decisão 15 que mantinha pessoa física sem publicar. O diretório de empresas para profissionais continua sem listar pessoa física.
26. **Padrão do aviso de limite**: quando uma ação está bloqueada pelo plano, a tela mostra `AvisoLimite` **antes dos campos** (nunca no fim, nunca um erro solto), desativa os campos, trava o botão com cadeado e, se a entrada é um botão (como o + da lista), abre o aviso num popup em vez de levar ao formulário e não deixa nenhum atalho que pareça permitir a ação. O texto vem de `lib/limite-plano.ts`; números de limite vêm sempre da API.
27. **Papéis das cores** (2026-10-14): roxo `--accent` = marca, ação principal e estado ativo; teal `--secondary` = verificado, disponível e sucesso (texto usa `--secondary`, preenchimento usa `--secondary-fill`, porque o teal puro não passa de 2:1 sobre o fundo claro); âmbar `--tertiary` = só alerta e estrelas; neutros lilás para fundo, texto e sombras. Azul de informação adiado. Cor nova entra por token em `globals.css`, nunca solta no componente.
