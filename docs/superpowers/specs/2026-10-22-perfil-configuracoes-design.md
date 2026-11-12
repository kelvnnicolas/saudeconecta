# Perfil: edição de dados e configurações (F-035, F-036)

**Data:** 2026-10-22 · **Estado:** aprovado (decisão 29 do `STATUS.md`) · **Escopo:** `docs/escopo-planos.md`, seção 2.5 · **Itens:** F-035, F-036, T-031, T-032, V-014

## 1. Problema

A tela `/perfil` foi entregue só para leitura. Hoje ela:

- **Não deixa corrigir nada** depois do cadastro: nome, telefone, cidade, especialidades, preço e registro ficam como foram digitados no cadastro.
- **Não tem onde preencher a bio.** O campo `profissionais.bio` existe, aparece no perfil público, conta para o badge de perfil completo (F-034, V-013), mas nenhuma tela grava nele.
- **Nunca mostra o telefone**, que o cadastro exige (`min 8`). Não há rota que devolva o próprio `profiles.telefone` ao frontend (`ProfileRead` só sai de `POST /auth/sync` e do upload de avatar).
- **Põe "Sair" como ação mais visível**: ícone no topo, ao lado do sino, a um toque de distância, sem confirmação.
- **Põe "Aparência" no fim da página, maior que os dados da pessoa:** três blocos altos ocupando um cartão inteiro, com texto explicativo. Os botões inativos usam `bg-surface-container-low`, que tem a mesma cor do fundo (T-018), então só o ícone e o texto aparecem, sem forma de botão. Também não há `aria-pressed` nem papel de grupo: leitor de tela não sabe qual opção está ativa.

O design de referência (`docs/design/telas/meu_perfil/screen.png`) já previa engrenagem de configurações, formulário editável, "Salvar alterações", link para o perfil público e "Sair da conta" no rodapé.

## 2. Estrutura proposta

Três telas, cada uma com uma função:

| Rota | Padrão | Função |
|---|---|---|
| `/perfil` | Detalhe (leitura) | Quem eu sou e como os outros me veem |
| `/perfil/editar` | Formulário em página | Corrigir dados pessoais, de contato e profissionais |
| `/perfil/configuracoes` | Configurações | Aparência, conta e sair |

Formulário em **página**, não em gaveta ou modal: são 7 a 9 campos, com lista de especialidades, e a página já reaproveita o `useAvisoAoSair` (fecha o F-004).

### 2.1 `/perfil` (leitura)

```
┌──────────────────────────────────────┐
│ [logo] Meu Perfil        🔔   ⚙      │  ⚙ = Configurações (44×44, aria-label)
├──────────────────────────────────────┤
│            (foto) 📷                 │
│         Camila Andrade               │
│   [selo do registro, se houver]      │
│   ✉ camila@…      ☎ (48) 9…          │  telefone: só o próprio vê
│   📍 Florianópolis, SC               │
│   [ ✎ Editar perfil ]  ← ação principal (vidro-acento)
├──────────────────────────────────────┤
│ Dados profissionais                  │
│   Bio (ou "Conte em 2 linhas…" + link│
│   para editar, se vazia)             │
│   Especialidades (chips)             │
│   R$ 80/hora                         │
│   Registro + VerificacaoDoRegistro   │
│   Ver perfil público →               │
├──────────────────────────────────────┤
│ (empresa: Dados da empresa +         │
│  Ver minha assinatura →)             │
└──────────────────────────────────────┘
```

- Sai o cartão "Localização" sozinho (vai para o resumo) e sai `ThemeSettings` desta tela.
- O ícone de sair no topo é trocado pela engrenagem. "Sair" vai para Configurações.
- Bio vazia vira convite com ação ("Adicionar apresentação"), não espaço em branco.

### 2.2 `/perfil/editar`

Seções na mesma página (sem abas: no celular, abas escondem campos com erro):

**Dados pessoais e de contato** (todos os papéis)
- Nome completo (obrigatório, até 255)
- Telefone / WhatsApp (obrigatório, mesma regra do cadastro). Texto de apoio: "Não aparece no seu perfil público."
- Cidade e UF (`CidadeEstadoFields`)
- E-mail: só leitura, com "Para trocar o e-mail, fale com o suporte" até o B-004 ser resolvido (a troca pelo Supabase manda link de confirmação, que hoje aponta para o domínio errado).

**Dados profissionais** (profissional)
- Apresentação / bio, com contador (limite proposto: 600 caracteres, ver T-032)
- Especialidades (mesma lista de chips do cadastro; extrair para um componente comum)
- Preço por hora (opcional, "a combinar" quando vazio)
- Registro profissional. **Se a pessoa tem selo conferido e altera o número**, avisar antes de salvar: "Ao mudar o número, o selo de registro conferido sai do seu perfil até uma nova conferência." (o backend já derruba o selo, F-031).

**Dados da empresa** (empresa)
- Nome fantasia, tipo (pessoa física, família, clínica…)

**Rodapé fixo:** `Salvar alterações` (desabilitado enquanto não houver mudança; com spinner ao salvar) e `Cancelar`. Ao sair com mudanças, `useAvisoAoSair`. Sucesso: volta a `/perfil` com aviso "Perfil atualizado". Erro: mensagem no topo do formulário, sem perder o que foi digitado.

### 2.3 `/perfil/configuracoes`

```
┌──────────────────────────────────────┐
│ ← Configurações                      │
├──────────────────────────────────────┤
│ Aparência                            │
│ ┌────────┬────────┬────────┐         │  controle segmentado, 44 px de altura
│ │☀ Claro │☾ Escuro│◐ Sistema│        │  role="radiogroup" / aria-checked
│ └────────┴────────┴────────┘         │
│ Sistema segue o seu aparelho.        │
├──────────────────────────────────────┤
│ Conta                                │
│   E-mail            camila@…         │
│   Alterar senha                 →    │  fase 4, opcional
├──────────────────────────────────────┤
│   ⎋ Sair da conta                    │  texto em cor de erro, sem destaque
└──────────────────────────────────────┘
```

**Aparência como controle segmentado:** uma linha só, ícone e rótulo lado a lado, trilho em `neu-inset-sm` e a opção ativa em relevo (`neu-surface-sm` + `text-primary`), como um interruptor físico. Fica do tamanho de um campo, não de um cartão. Continua sendo o **único** controle de tema do app (decisão do B-006).

## 3. Backend

| Mudança | Por quê |
|---|---|
| `GET /perfis/me` → `ProfileRead` (próprio usuário) | O frontend não tem como ler o próprio telefone hoje |
| `PATCH /perfis/me` com `nome`, `telefone`, `cidade`, `estado` (todos opcionais) | Editar sem usar `/auth/sync`, que reescreve o `papel` e zera o que não vier (T-031) |
| No `PATCH`, se o papel for `empresa`, gravar `empresas.cidade/estado` na **mesma transação** | Hoje a cidade da empresa existe em `profiles` e em `empresas`; editar só uma desalinha `/perfil` (lê `empresas`) e outras telas |
| Limite da bio (`max_length=600`) no `ProfissionalUpdateRequest` | Hoje `bio` é `Text` sem limite (T-032) |
| Nada muda no `PUT /profissionais/me` | Mas ele **substitui tudo**: o frontend tem de reenviar bio, preço, registro e especialidades sempre, senão apaga (ex.: sem `especialidade_ids`, as especialidades somem) |

Nenhuma migration. O `telefone` continua só no `ProfileRead` próprio: **não entra** em `ProfissionalRead` nem em `EmpresaRead` (escopo 2.5).

## 4. Fases

1. **Reorganizar a leitura e criar Configurações** (só frontend): engrenagem, `/perfil/configuracoes` com Aparência segmentada e Sair; bio no cartão de dados profissionais. Corrige já os defeitos do controle de tema (botões invisíveis, sem estado acessível).
2. **Backend:** `GET/PATCH /perfis/me`, limite da bio, testes.
3. **`/perfil/editar`:** formulário por papel, com aviso do selo, `useAvisoAoSair` (fecha F-004) e componente comum de especialidades.
4. **Opcional, aguarda a D-019:** alterar senha em Configurações (`supabase.auth.updateUser({ password })` com o `CampoSenha` e a mesma política do cadastro).

Cada fase é um PR pequeno. A 1 não depende da 2.

## 5. Critérios de aceite

- Profissional altera nome, telefone, cidade, bio, especialidades e preço; os novos valores aparecem em `/perfil`, no perfil público (menos o telefone) e na busca.
- Salvar sem tocar nas especialidades **não** as apaga.
- Alterar o registro com selo conferido mostra o aviso; ao salvar, o selo some do perfil público.
- Empresa altera cidade e o diretório de empresas e `/perfil` mostram a mesma cidade.
- `PATCH /perfis/me` não aceita `papel` (campo ignorado ou 422) e não apaga o que não foi enviado.
- O telefone não aparece em nenhuma resposta pública (`GET /profissionais/{id}`, `/empresas/{id}`, busca, diretório).
- Aparência: uma linha, 44 px, estado ativo visível nos dois temas, navegável por teclado (setas ou Tab) e anunciado por leitor de tela.
- Sair não fica mais a um toque acidental no topo.
- Conferido a 375 px e 1280 px, claro e escuro.

## 6. Testes

- **API:** `GET/PATCH /perfis/me` (401 sem token; atualização parcial; `papel` não muda; empresa sincroniza `empresas.cidade`); `PUT /profissionais/me` com bio acima de 600 → 422; telefone ausente de todas as respostas públicas.
- **Frontend:** `tsc` e `next lint`; navegador com API simulada nos dois papéis e nos dois temas; o fluxo logado de verdade fica na V-014.
