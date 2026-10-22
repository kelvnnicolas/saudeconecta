# Verificação de registro profissional (F-031)

**Status:** desenho aguardando revisão. **Itens relacionados:** F-031 (este), D-009 (resolvida por este escopo), D-016 (parceria com o COREN-SC, não bloqueia), V-012 (validação), F-006 (administrador, aproveita a tabela), T-022 (promessas dos planos).

## 1. Objetivo e limites
Diferenciar **registro informado** (autodeclarado) de **registro conferido** pelo SaúdeConecta, sem bloquear o cadastro nem a busca de quem não é conferido. A conferência é **manual, feita por um administrador numa fonte oficial**; não há API nem coleta automatizada. Nada de cópias de documentos.

**Regra de comunicação:** o selo diz "Registro profissional conferido pelo SaúdeConecta em DD/MM/AAAA". Nunca "validado pelo COREN" nem "parceiro COREN" sem fundamento e autorização.

## 2. O que existe hoje (auditoria de 2026-10-22)
- `profissionais.verificado`: booleano que **nenhum código grava**; a API só o lê e o profissional não consegue enviá-lo. `registro_profissional` é texto livre (100 caracteres), sem conselho nem UF.
- **Não há papel de administrador**: `Papel` tem só `profissional` e `empresa`; `CurrentUser` traz id, e-mail e o `role` do Supabase.
- O perfil público já exibe o registro autodeclarado ao lado da especialidade, sem distinguir informado de conferido.
- `/buscar` ("Prontos para atendimento e verificados") e `/empresa/planos` ("acessar profissionais verificados") prometem verificação que não existe.
- `GET /profissionais` não tem filtro de verificação.

## 3. Decisões (aprovadas em 2026-10-22)
1. **Administrador:** tabela `administradores`, conferida no servidor a cada chamada. O primeiro é criado por SQL no Supabase.
2. **Escopo:** três PRs, na ordem: (A) backend, (B) exibição pública e correção dos textos, (C) tela de administração.
3. **Pedido de conferência:** o profissional pode pedir pelo próprio perfil (`unverified` → `pending`), só se informou o registro. Isso não dá selo.
4. **Trilha sem texto livre:** só campos estruturados, para minimizar dados.

## 4. Modelo de dados (migration aditiva)
**Enum** `status_verificacao_enum`: `unverified`, `pending`, `verified`, `irregular`, `unable_to_verify`.

**`profissionais`** ganha:
- `verificacao_status` (enum, não nulo, padrão `unverified`);
- `verificado_em` (timestamptz, nulo): data da última conferência com resultado `verified`.

`verificado` (booleano antigo) **continua na tabela e passa a ser mantido pelo serviço** (`verdadeiro` só quando `verified`), para não quebrar nada; a API passa a derivá-lo do estado. Remoção da coluna numa migration futura (dívida registrada no `nextmove.md`). A migration converte quem já tinha `verificado = true` em `verified`.

**`administradores`**: `user_id` (UUID, chave primária, sem FK: o administrador pode não ter perfil), `criado_em`.

**`verificacoes_registro`** (só inserção, a trilha de auditoria):
`id`, `profissional_id` (FK `profissionais`, `ON DELETE CASCADE`), `status_anterior`, `status_novo`, `conselho` (até 20), `uf` (2), `numero_registro` (até 40), `metodo` (fixo `consulta_manual_fonte_oficial` nas conferências), `fonte` (até 255: nome ou endereço do portal consultado), `verificado_em`, `ator_tipo` (`profissional`, `administrador` ou `sistema`), `ator_id` (UUID, nulo para o sistema), `criado_em`. **Sem texto livre.**

## 5. Estados e transições
| De | Para | Quem | Condição |
|---|---|---|---|
| `unverified`, `unable_to_verify`, `irregular` | `pending` | profissional | `registro_profissional` preenchido |
| `unverified`, `pending`, `unable_to_verify`, `irregular`, `verified` | `verified` | administrador | conselho, UF, número e fonte obrigatórios |
| qualquer | `irregular` | administrador | fonte obrigatória |
| qualquer | `unable_to_verify` | administrador | fonte obrigatória |
| `verified`, `pending`, `irregular`, `unable_to_verify` | `unverified` | **sistema** | o profissional **alterou** o `registro_profissional`: a conferência anterior deixa de valer |
| qualquer outra | | | 409 `transicao_invalida` |

Toda transição grava uma linha na trilha com o ator. O profissional **nunca** consegue chegar a `verified`, `irregular` ou `unable_to_verify`.

## 6. API
- `POST /profissionais/me/verificacao/solicitar`: pede a conferência. 400 `registro_nao_informado`; 409 `verificacao_ja_solicitada` ou `ja_verificado`.
- `GET /admin/eu`: 200 para administrador, 403 `apenas_admin` para os demais (a tela de administração usa para decidir se aparece).
- `GET /admin/verificacoes?status=pending`: lista paginada (nome, cidade, UF, registro informado, estado, data do pedido).
- `GET /admin/profissionais/{id}/verificacoes`: histórico da trilha.
- `POST /admin/profissionais/{id}/verificacao`: registra o resultado (`status` entre `verified`, `irregular`, `unable_to_verify`, mais os campos acima).
- Todas as rotas de administração: 401 sem login, 403 `apenas_admin` sem a linha em `administradores`, com limite de requisições.
- `GET /profissionais` ganha o filtro opcional `verificado=true`. Os itens já trazem o campo `verificado`, então a busca **identifica** os conferidos sem excluir os demais.

## 7. O que cada pessoa vê
- **Público** (perfil e busca): só `verified` aparece, como "Registro conferido pelo SaúdeConecta em DD/MM/AAAA". Qualquer outro estado mostra apenas "Registro informado" (se houver). **Pendente, irregular e não localizado são indistinguíveis para o público**, para não expor nem difamar ninguém. Nenhum dado da trilha sai nas rotas públicas.
- **O próprio profissional** (`/perfil`): vê o próprio estado em palavras simples, e o botão de pedir conferência quando couber.
- **Administrador**: vê a lista e a trilha, na tela de administração.

## 8. Dados pessoais, retenção e acesso
- **Dados tratados:** número de registro (já público nos conselhos), conselho, UF, fonte e o id do administrador. Nada de documentos nem fotos.
- **Acesso:** trilha e lista só para administradores; nada na API pública.
- **Retenção:** a trilha dura enquanto o perfil existir e é apagada junto com ele (`ON DELETE CASCADE`). **Prazo legal e base legal precisam de revisão jurídica sua** (esta é uma proposta técnica, não aconselhamento jurídico).
- **Risco principal:** conta de administrador comprometida poderia dar selos falsos. Mitigações: trilha completa e identificada, lista curta de administradores revogável na hora, limite de requisições. Autenticação reforçada para administradores fica como evolução.

## 9. Textos a corrigir junto (PR B)
`/buscar`: remover "e verificados" (hoje ninguém é). `/empresa/planos`: trocar "acessar profissionais verificados" por algo verdadeiro, alinhado ao T-022.

## 10. Testes (escritos antes do código)
Transições (todas as permitidas e as proibidas), permissões (sem login, profissional, administrador), trilha (uma linha por mudança, com o ator certo), reinício ao alterar o registro, exibição pública sem vazar estado nem trilha, filtro da busca, e o cadastro e a busca continuando a funcionar sem nenhuma verificação. A migration entra no teste de ida e volta que já existe.

## 11. Entrega e riscos de rollout
- **Três PRs:** (A) backend com migration e testes; (B) perfil, busca, pedido de conferência e textos; (C) `/admin/verificacoes`.
- **A migration é manual** (T-007): aplicar `alembic upgrade head` **antes** do merge do PR A. Ela é aditiva; o código novo exige as colunas.
- **Primeiro administrador:** `INSERT INTO administradores (user_id) VALUES ('<id do seu usuário no Supabase>')`; o id vem de `SELECT id, email FROM auth.users WHERE email = '...'`.

## 12. Fora de escopo (por enquanto)
Consulta automática a qualquer fonte; importação de cadastros; upload de documentos; avisar o profissional do resultado por notificação (exigiria novos tipos de notificação e migration; fica como F-032 se você quiser); reautenticação reforçada do administrador.
