# Auditoria de microcopy — pop-ups, alertas, erros e confirmações

**Data:** 2026-10-22 · **Base auditada:** `origin/main` em `b4bb3a3` (inclui o PR #77, `AvisoDialogo`). A branch `feat/verificacao-registro-*` (F-031) não está no `main` e foi lida só para o item 15.
**Estado:** aprovada e implementada em 2026-10-22 (branch `chore/microcopy-auditoria`). M-21 e M-65 mantidos como estão (decisão D-021 no `nextmove.md`); M-64 adiado até o merge da F-031. Os itens I-02 a I-10 seguem como pendências no `nextmove.md`.

## 1. Como as mensagens chegam à tela

- Quase toda tela mostra `e.message` de um `ApiError` (`apps/web/lib/api.ts`). Para 401, 429 e 5xx o texto é trocado por uma frase fixa do frontend; para os demais status o texto do **backend passa direto**. Logo, o texto do backend é texto de interface: mudar a frase no backend muda a tela.
- A lógica do frontend usa o **`code`** (`limite_atingido`, `pagamento_pendente`, `avaliacao_existente`, `interesse_existente`, `transicao_invalida`), nunca o texto. Mudar frases não quebra esses fluxos.
- Erros do Supabase Auth vêm em inglês e são traduzidos por `lib/erros-auth.ts`.
- **Exceção que depende de texto:** `entrar/page.tsx:119` decide mostrar "Se ainda não tem cadastro…" com `mensagem.startsWith("E-mail ou senha incorretos")`. Trocar a frase sem tratar isso apaga o link.
- Não há sistema de toast: sucesso vira tela cheia (`check_circle`), erro vira linha vermelha (`role="alert"`), decisão vira `AlertDialog` (Radix) ou `ModalLimite`. Não proponho criar toast.
- O frontend **não tem suíte de testes** (só `next lint` e `tsc`). O backend tem 309+ testes; só 2 conferem frase exata (`test_contato_direto.py:24`, `test_diretorio_empresas.py:116`).

## 2. Tabela de mensagens

Legenda de ação: **Trocar** (texto novo), **Manter** (já está bom; registrado para constar), **Decidir** (depende de você).

### 2.1 Autenticação

| ID | Onde / quando aparece | Texto atual | Texto proposto | Por quê | Ação |
|---|---|---|---|---|---|
| M-01 | `entrar/page.tsx:314`. Senha correta, mas a conta é de **profissional** e a aba escolhida era "Empresa ou pessoa". | **Título:** "Esta conta é de profissional" · **Corpo:** "O tipo de conta é definido no cadastro. Ajustamos a opção na tela para o tipo certo: quer entrar agora?" · **Botão:** "Entrar como profissional" | **Título:** "Vamos continuar por aqui?" · **Corpo:** "Você está entrando com uma conta de profissional de saúde. Para acessar seu perfil e suas oportunidades, entre como profissional." · **Botão:** "Continuar como profissional" · **Secundário:** "Agora não" | Fala do que a pessoa vai fazer, não da regra interna ("definido no cadastro"). O corpo cita o que ela ganha (perfil e oportunidades, que existem: `/perfil`, `/oportunidades`). O modal hoje só tem um botão e o `AlertDialog` não fecha por clique fora: no celular não há como dispensar sem o botão. | Trocar |
| M-02 | Idem, conta de **empresa ou pessoa** e aba "Profissional". | "Esta conta é de empresa ou pessoa" · mesmo corpo · "Entrar como empresa ou pessoa" | **Título:** "Vamos continuar por aqui?" · **Corpo:** "Esta é uma conta de empresa ou pessoa. Para publicar demandas e encontrar profissionais, entre como empresa ou pessoa." · **Botão:** "Continuar como empresa ou pessoa" · **Secundário:** "Agora não" | Mesma lógica; "empresa ou pessoa" é o rótulo que a aba já usa. O modal só aparece depois de a senha ser aceita, então não revela existência de conta a quem não a tem. | Trocar |
| M-03 | `erros-auth.ts` + `entrar/page.tsx:226-238`. E-mail ou senha errados. | "E-mail ou senha incorretos." e abaixo "Se ainda não tem cadastro, criar conta de empresa." | "E-mail ou senha incorretos. Confira os dados e tente de novo." e abaixo "Ainda não tem conta? Criar conta de empresa" | Dá o próximo passo. Continua sem dizer **qual** dos dois está errado (não permite enumerar contas). O texto do link usa `papelAtual.criar` como já faz hoje. | Trocar |
| M-04 | `entrar/page.tsx:116,138,156,168`. Falha de login que não é credencial (Supabase fora, etc.). | "Não foi possível entrar. Verifique os dados." · "Não foi possível entrar com o Google." (e LinkedIn, Facebook) | "Não conseguimos fazer o login agora. Tente de novo em instantes." · "Não conseguimos entrar com o Google. Tente de novo ou use e-mail e senha." | "Verifique os dados" culpa a pessoa quando o erro é nosso. | Trocar |
| M-05 | `erros-auth.ts`. Login de conta com e-mail não confirmado. | "Confirme seu e-mail antes de entrar. O link foi enviado para a sua caixa de entrada." | "Falta confirmar seu e-mail. Procure a mensagem de confirmação na caixa de entrada ou no spam." | Não afirma que o envio aconteceu (e-mail do app depende do F-003; o do Auth sai pelo Supabase). | Trocar |
| M-06 | `supabase-client.ts:96`. Cadastro criado, mas o Supabase exige confirmação de e-mail. Hoje aparece **em vermelho** como erro. | "Enviamos um link de confirmação para o seu e-mail. Confirme antes de continuar." | "Falta confirmar seu e-mail. Procure a mensagem de confirmação na caixa de entrada ou no spam e depois entre na sua conta." | Mesmo critério do M-05. A cor de erro é problema de comportamento (ver I-02), não de texto. | Trocar |
| M-07 | `erros-auth.ts`. Cadastro com e-mail já existente (só quando o Supabase devolve "already registered"). | "Este e-mail já tem cadastro. Entre na sua conta ou recupere a senha." | "Já existe uma conta com este e-mail. Entre ou recupere a senha." | Mais curto, mesma ação. **Não muda o comportamento de segurança:** o cadastro já revela isso quando o Supabase responde assim (ver I-03). | Trocar |
| M-08 | `validations/senha.ts`. Senha fraca no cadastro e na troca. | "A senha precisa de: 8 caracteres, letra maiúscula" · servidor: "Escolha uma senha mais forte: 8 caracteres ou mais, com maiúscula, minúscula, número e símbolo." | "Falta na senha: 8 caracteres, letra maiúscula." · servidor: manter | Diz o que falta, sem tom de bronca. O checklist visual já existe. | Trocar (só o 1º) |
| M-09 | `nova-senha/page.tsx:53`. Falha ao salvar nova senha. O `catch` descarta o erro real. | "Não foi possível salvar a nova senha. Peça um novo link e tente de novo." | Usar `mensagemDeErroAuth(e, "Não conseguimos salvar a nova senha. Tente de novo ou peça um novo link.")`, o que mostra "A nova senha precisa ser diferente da atual." e "Escolha uma senha mais forte…" quando for o caso | "Peça um novo link" é conselho errado quando a causa é senha repetida ou fraca (as traduções já existem em `erros-auth.ts`, mas esta tela não as usa). Não altera o fluxo. | Trocar |
| M-10 | `esqueci-senha/page.tsx:44,28`. Pedido de recuperação. | "Se esse e-mail tiver cadastro, enviamos um link para você criar uma nova senha. Confira também a caixa de spam." · erro: "Não foi possível enviar o link agora. Tente novamente em instantes." | — | Já é neutro (não revela se o e-mail existe) e orienta. Registrado para constar. | Manter |
| M-11 | `nova-senha/page.tsx:73`. Link de recuperação inválido. | "Este link é inválido ou expirou. Peça um novo para continuar." + "Pedir novo link" | — | Claro e com ação. | Manter |
| M-12 | `lib/api.ts:597`. HTTP 401 em qualquer chamada. | "Sua sessão expirou. Entre novamente para continuar." | — | Texto bom. O problema é o comportamento: não leva ao login (ver I-04). | Manter |
| M-13 | `erros-auth.ts` e `api.ts`. Limite de requisições (429). | Duas cópias: "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo." | Uma só, em `lib/mensagens.ts` | Mesma frase em dois arquivos. | Centralizar |
| M-14 | `erros-auth.ts:15` e `api.ts:599`. Sem rede. | "Não foi possível conectar. Verifique sua conexão e tente de novo." / "Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo." | "Não conseguimos conectar. Verifique sua internet e tente de novo." (uma só) | Duas versões diferentes para o mesmo caso. | Centralizar |
| M-15 | `supabase-client.ts` (6 pontos). Variáveis do Supabase ausentes. Pode chegar à tela por `mensagemDeErroAuth`. | "Supabase não configurado (ver .env.example)" | Tela: "Não conseguimos conectar ao serviço de login agora." · detalhe técnico só em `console.error` em desenvolvimento | Expõe nome de fornecedor e arquivo interno. | Trocar |

### 2.2 Erros gerais, sessão e permissão

| ID | Onde / quando aparece | Texto atual | Texto proposto | Por quê | Ação |
|---|---|---|---|---|---|
| M-16 | `app/error.tsx`. **Qualquer** exceção de renderização no app. | Ícone `wifi_off` · "Erro de conexão" · "Não conseguimos falar com o servidor agora. Verifique sua conexão e tente de novo." · "Tentar novamente" | Ícone `error` · "Algo deu errado" · "Não foi possível mostrar esta tela. Tente de novo; se continuar, recarregue a página." · "Tentar novamente" | O texto atual afirma problema de rede, mas esta tela captura falha de código, não de rede (falhas de rede são tratadas em `request()`). Diagnóstico errado manda a pessoa checar o wi-fi. | Trocar |
| M-17 | `api.ts` 5xx. | "Algo deu errado do nosso lado. Tente novamente em instantes." | — | Honesto e curto. | Manter |
| M-18 | `api.ts` 403/404/410 sem frase própria. | Cai em "Não foi possível concluir a ação. Tente novamente." | Para 403 sem mensagem: "Você não tem permissão para fazer isso." | "Tente novamente" não ajuda em 403. As rotas atuais sempre mandam frase em 403, então é só rede de segurança. | Trocar |
| M-19 | Backend `entitlements.py`, `demandas.py` (`exigir_papel`), `billing.py`. Conta do tipo errado chama a rota (403). | "Recurso disponível só para empresas" / "…só para profissionais" | "Esta ação é só para contas de empresa ou pessoa." / "Esta ação é só para contas de profissional." | "Recurso" é jargão. Só aparece se a tela deixar passar (hoje `ApenasPara` desvia antes). **Exige atualizar 2 testes** que conferem a frase. | Trocar |
| M-20 | Backend `profissional_service.py:48`, `empresa_service.py:130`. | "Apenas usuários com papel 'profissional' podem editar este recurso" | "Só contas de profissional podem editar este perfil." / "Só contas de empresa ou pessoa podem editar este perfil." | Expõe o termo interno "papel". | Trocar |
| M-21 | Backend `errors.py`. Perfil sem registro no banco. | "Seu perfil ainda não foi concluído. Saia e entre novamente para finalizar o cadastro." | **Decidir** (ver I-02) | A instrução **não funciona**: entrar de novo não conclui nada, porque `syncProfile` só roda nas telas de cadastro. Prometer algo que o sistema não faz. | Decidir |
| M-22 | Backend `relatorio_service.py:23`. | "data_fim não pode ser anterior a data_inicio" | "A data final não pode ser anterior à data inicial." | Nome de parâmetro exposto. Endpoint é de analytics, sem tela hoje. | Trocar |

### 2.3 Formulários e validação

| ID | Onde / quando aparece | Texto atual | Texto proposto | Por quê | Ação |
|---|---|---|---|---|---|
| M-23 | `validations/auth.ts`, `demanda.ts` (UF). | "UF com 2 letras" | "Informe a UF com 2 letras, como SP." | Frase solta de campo vira instrução. | Trocar |
| M-24 | `validations/auth.ts` (telefone). | "Informe um telefone válido" | "Informe um telefone com DDD." | Diz o que falta. A regra continua `min(8)`; o texto só orienta. | Trocar |
| M-25 | `validations/contato.ts`. Mensagem de contato. | `min(10)`: "Descreva a necessidade com mais detalhes" · `max(1000)`: **sem mensagem** (zod mostra "String must contain at most 1000 character(s)" em inglês) | "Conte um pouco mais: use pelo menos 10 caracteres." · "Use no máximo 1.000 caracteres." | Falha real de idioma. | Trocar |
| M-26 | `validations/contato.ts` (comentário da avaliação, `max(500)`). | Sem mensagem (inglês) | "Use no máximo 500 caracteres." | Idem. A tela hoje não exibe esse erro; a mensagem fica pronta. | Trocar |
| M-27 | `validations/shared.ts`. Valor/hora e valor oferecido. | "Informe um valor válido" | "Informe um valor maior que zero." | É exatamente o que `positive()` verifica. | Trocar |
| M-28 | `validations/demanda.ts`. | "Descreva a necessidade" · "Máximo de 500 caracteres" | "Descreva o que você precisa." · "Use no máximo 500 caracteres." | Alinha com M-25. | Trocar |
| M-29 | Campos obrigatórios restantes ("Informe a cidade", "Informe o nome da empresa", "Selecione a especialidade", "Confirme a senha"…). | — | — | Curtos, claros, acionáveis. | Manter |

### 2.4 Demandas, interesse e contatos

| ID | Onde / quando aparece | Texto atual | Texto proposto | Por quê | Ação |
|---|---|---|---|---|---|
| M-30 | `demandas/nova/page.tsx:108`. Publicou a demanda. | "Demanda publicada!" · "Os profissionais qualificados na região já foram notificados da sua solicitação." · "Acompanhar respostas" | "Demanda publicada" · "Ela já aparece para profissionais compatíveis da sua cidade. Você recebe um aviso no sino quando alguém demonstrar interesse." · "Ver minhas demandas" | "Já foram notificados" não é garantido: só recebe aviso quem tem a especialidade **e** a mesma cidade, pode ser ninguém, e se o lote de avisos falhar a demanda é publicada sem aviso (`registrar_notificacoes_em_lote`, STATUS T-003). O que é certo: ela aparece em `/oportunidades` e o sino avisa do interesse. Sem exclamação. | Trocar |
| M-31 | `contato/novo/page.tsx:50-57`. Enviou o contato. | "Proposta enviada!" · "{nome} vai receber sua mensagem por e-mail e poderá te responder por aqui." · "Ver meus contatos" · botão do formulário: "Enviar proposta" | "Mensagem enviada" · "{nome} vai ver sua mensagem no SaúdeConecta e poderá responder por aqui. Você recebe um aviso no sino quando houver resposta." · "Ver meus contatos" · "Enviar mensagem" | **Hoje nenhum e-mail chega a usuário real** (STATUS: F-003, remetente `onboarding@resend.dev`). A tela promete e-mail. "Proposta" não bate com o resto do produto, que chama a tela de "Novo Contato" e a conversa de "mensagem". | Trocar (terminologia: ver §5) |
| M-32 | `contato/novo/page.tsx:41`. Falha ao enviar contato (outras que não limite/pagamento). | "Não foi possível enviar. Tente novamente." | "Não conseguimos enviar sua mensagem. Tente de novo em instantes." | Diz o que não deu certo. | Trocar |
| M-33 | `demandas/nova/page.tsx:98`. Falha ao publicar. | "Não foi possível publicar a demanda." | "Não conseguimos publicar sua demanda. Tente de novo em instantes." | Idem. Não afirma que o formulário foi preservado. | Trocar |
| M-34 | `oportunidades/page.tsx:44`. Falha ao demonstrar interesse. | "Não foi possível enviar. Tente de novo." | "Não conseguimos registrar seu interesse. Tente de novo." | Idem. Os casos 409 `interesse_existente` (tratado como sucesso) e 410 "Esta demanda não está mais aberta" ficam. | Trocar |
| M-35 | `contatos/[id]/page.tsx:119,133`. Falha no chat / aceite. | "Não foi possível enviar a mensagem." · "Não foi possível aceitar a demanda." | "Não conseguimos enviar a mensagem. Tente de novo." · "Não conseguimos registrar o aceite. Tente de novo." | Idem. | Trocar |
| M-36 | `demandas/page.tsx:73`. Falha ao mudar status. | "Não foi possível atualizar o status." | "Não conseguimos atualizar a demanda. Tente de novo." | Idem. O caso `transicao_invalida` é engolido sem aviso (ver I-05). | Trocar |
| M-37 | Backend `demandas.py:231`. Mudar status de demanda já encerrada/expirada (409). | "Só é possível mudar uma demanda aberta para preenchida ou encerrada" | "Esta demanda não está mais aberta, então não dá para alterá-la." | Explica o que aconteceu em vez de repetir a regra. Hoje a tela nem exibe (I-05). | Trocar |
| M-38 | `contatos/[id]/page.tsx:262`, `demandas`, `avaliacoes`: títulos de sucesso com "!" ("Avaliação enviada!"). | "Avaliação enviada!" · "Obrigado pelo retorno." | "Avaliação enviada" · "Obrigado por contar como foi." | Diretriz: sem exclamações. | Trocar |
| M-39 | `contatos/[id]/page.tsx:97`. Avaliação duplicada (popup, validado em 2026-10-22). | "Você já avaliou esta pessoa" · "Cada pessoa pode ser avaliada uma única vez, e a sua avaliação de {nome} já foi registrada." | — | Recente, validado, claro. Só ganha o botão secundário se for decidido no M-01. | Manter |
| M-40 | Listas: `contatos/page.tsx:57`, `avaliacoes/page.tsx:25`. Falha ao carregar. | "Não foi possível carregar." | "Não conseguimos carregar seus contatos. Atualize a página para tentar de novo." / "…suas avaliações…" | "Carregar" o quê? As demais telas já dizem. | Trocar |

### 2.5 Limite mensal, assinatura e pagamento

| ID | Onde / quando aparece | Texto atual | Texto proposto | Por quê | Ação |
|---|---|---|---|---|---|
| M-41 | `limite-plano.ts`. Plano gratuito esgotado (`ModalLimite`/`AvisoLimite`). | "Limite mensal atingido" · "Você utilizou os 5 usos gratuitos deste mês, entre demandas publicadas e contatos iniciados." · "Para continuar encontrando profissionais de saúde, conheça os planos do SaúdeConecta: o Essencial permite até 50 por mês e o Pro não tem limite." · "Seu limite renova em 1º de novembro." · "Conhecer os planos" | "Você atingiu o limite do mês" · "Você usou os 5 contatos e demandas gratuitos deste mês." · "Quer continuar antes disso? O Essencial permite até 50 por mês e o Pro não tem limite." · (renovação igual) · "Ver os planos" | "Usos" é jargão (a barra já diz "Contatos e demandas"). Título igual ao do aviso no sino. Os números continuam vindo da API. | Trocar |
| M-42 | `limite-plano.ts`. Plano pago esgotado. | "Você utilizou os {limite} usos do plano {nome} neste mês…" · "Mude para o plano Pro e continue encontrando profissionais de saúde sem limite." · sem Pro: "Fale com a gente para ampliar o seu limite." | "Você usou os {limite} contatos e demandas do plano {nome} neste mês." · "Quer continuar antes disso? O plano Pro não tem limite." · sem Pro: "Veja as opções da sua assinatura." | "Fale com a gente" aponta para um canal que **não existe** (sem página de Contato, D-012). | Trocar |
| M-43 | `limite-plano.ts`. Pagamento pendente (402). | "Pagamento pendente" · "Não conseguimos cobrar a sua assinatura, então novos contatos e demandas estão pausados." · "Atualize o cartão para voltar a publicar demandas e iniciar contatos agora mesmo." · "Atualizar pagamento" | Igual, sem "agora mesmo" | "Agora mesmo" promete efeito imediato; a regularização depende do webhook do Stripe. | Trocar |
| M-44 | `UsoDaCota.tsx:41`. Barra de uso. | "Restam 2 usos neste mês" | "Restam 2 neste mês" (título da barra já diz "Contatos e demandas") | Jargão. | Trocar |
| M-45 | Backend `entitlements.py`. Recusa 409 no limite (aparece se a tela não bloqueou antes). | "Você atingiu o limite de contatos e demandas do seu plano neste mês." | — | Claro. | Manter |
| M-46 | Backend `entitlements.py`. Recusa 402. | "O pagamento da sua assinatura está pendente. Atualize o cartão para voltar a entrar em contato e publicar demandas." | — | Claro. | Manter |
| M-47 | Backend `aviso_cota.py`, notificação no sino a 80%. | "Sua cota do mês está acabando" · "Você já usou 4 de 5 contatos e demandas deste mês. Veja como ampliar o limite." | "Seu limite do mês está acabando" · corpo igual | "Cota" não aparece em nenhuma tela; o produto diz "limite". | Trocar |
| M-48 | Backend `aviso_cota.py`, esgotado. | "Você atingiu o limite do mês" · "Você usou os 5 contatos e demandas deste mês. Para continuar encontrando profissionais de saúde, veja os planos e escolha a opção ideal." | título igual · "Você usou os 5 contatos e demandas deste mês. Veja suas opções para continuar." | Corta o texto promocional. Neutro para gratuito (vai a `/empresa/planos`) e assinante (vai a `/assinatura`). | Trocar |
| M-49 | Backend `billing.py`, notificação do sino. | "Falha no pagamento" · "Não conseguimos processar o pagamento da sua assinatura." | "Pagamento não processado" · "Não conseguimos cobrar sua assinatura. Atualize o cartão em Minha assinatura." | Diz o próximo passo; o link da notificação já vai a `/assinatura`. | Trocar |
| M-50 | Backend `billing.py:54`. Falha do Stripe (502). | "Não foi possível concluir a operação com o Stripe. Tente novamente." | "Não conseguimos falar com o serviço de pagamento agora. Tente de novo em instantes." | Fornecedor e "operação" expostos. | Trocar |
| M-51 | Backend `billing.py`. Já tem assinatura. | "Esta empresa já tem uma assinatura. Use o portal para trocar de plano ou cancelar." · "Esta empresa já tem uma assinatura em andamento." · "Esta empresa ainda não tem assinatura." | "Você já tem uma assinatura. Para trocar de plano ou cancelar, use Gerenciar assinatura." · "Você já tem uma assinatura em andamento." · "Você ainda não tem assinatura." | "Esta empresa" fala em terceira pessoa com a própria pessoa (e pessoa física não é empresa). "Portal" é jargão; o botão da tela chama "Gerenciar assinatura". | Trocar |
| M-52 | Backend `billing.py:99`. Pagamento anterior em confirmação. | "O pagamento de um checkout anterior já foi concluído e está sendo confirmado." | "Seu pagamento anterior ainda está sendo confirmado. Acompanhe em Minha assinatura." | "Checkout" é jargão; não promete prazo. | Trocar |
| M-53 | `assinatura/page.tsx:41`, `empresa/planos/page.tsx:76`. Erro que não é `ApiError`. | "Backend indisponível — em modo de exemplo, o Portal do Stripe abriria aqui." / "…o redirecionamento para o Stripe aconteceria aqui." | "Não conseguimos abrir o pagamento agora. Tente de novo em instantes." | **Texto de desenvolvedor** que pode chegar a produção. | Trocar |
| M-54 | `empresa/planos/page.tsx:92`, `Header`. | Título "Planos B2B" | "Planos" | "B2B" é jargão interno; pessoa física também assina. | Trocar |
| M-55 | `assinatura/page.tsx:136`. | "Trocar cartão, baixar faturas ou cancelar a assinatura é feito no portal seguro do Stripe." | "Para trocar o cartão, baixar faturas ou cancelar, abriremos o portal seguro do Stripe." | "Portal" ok aqui (explica o botão); frase fica no futuro/ação. | Trocar |

### 2.6 Notificações e contatos

| ID | Onde / quando aparece | Texto atual | Texto proposto | Por quê | Ação |
|---|---|---|---|---|---|
| M-56 | Backend `demandas.py:104`. Aviso a profissional de demanda nova. | "Nova oportunidade compatível" · "Uma nova demanda em {cidade} bate com sua especialidade." | "Nova oportunidade compatível" · "Há uma nova demanda em {cidade} para a sua especialidade." | "Bate com" é coloquial. | Trocar |
| M-57 | Backend `contato_service.py`, `demandas.py`. "Novo contato recebido / {nome} enviou uma mensagem." · "Nova mensagem recebida" · "Demanda direta aceita" · "Novo interesse em demanda". | — | — | Claros e curtos. | Manter |
| M-58 | `NotificationBell.tsx`. "Notificações", "Marcar todas como lidas", "Nenhuma notificação ainda." | — | — | OK. | Manter |
| M-59 | Backend `avaliacao_service.py`, `profile_service.py`: "Você não pode avaliar a si mesmo", "Você só pode avaliar quem teve um contato registrado com você", "Complete seu perfil profissional antes de demonstrar interesse.", "Alguma especialidade escolhida não existe mais. Atualize a página e tente de novo." | — | — | Boas: dizem o motivo e o caminho. | Manter |

### 2.7 Upload de foto, documento e registro profissional

| ID | Onde / quando aparece | Texto atual | Texto proposto | Por quê | Ação |
|---|---|---|---|---|---|
| M-60 | Backend `profile_service.py:53`. Foto em formato não aceito (422). | "Formato de imagem não suportado. Use JPEG, PNG ou WEBP." | "Esse formato de imagem não é aceito. Use JPEG, PNG ou WEBP." | "Não suportado" é jargão. Mesma ação. | Trocar |
| M-61 | Backend `profile_service.py:58`. Foto acima de 5 MB. | "Imagem maior que o limite de 5MB." | "A imagem passa de 5 MB. Escolha uma foto menor." | Diz o que fazer. | Trocar |
| M-62 | `perfil/page.tsx:36`. Falha ao enviar a foto. | "Não foi possível enviar a foto." | "Não conseguimos enviar a foto. Tente de novo." | Idem. | Trocar |
| M-63 | **Documento:** não existe upload de documento na `main` (só foto de perfil). | — | — | Nada a revisar; não criar. | — |
| M-64 | **Verificação de registro profissional (item 15):** só existe nas branches F-031, **não no `main`**. Textos lidos: "Conferência solicitada. Avisaremos o resultado aqui quando a análise terminar." · "A conferência não confirmou o registro informado. Revise o número e peça uma nova conferência." · "Registro conferido pelo SaúdeConecta em DD/MM/AAAA". | — | Não editar agora. Depois do merge, revisar: "Avisaremos o resultado" só se houver notificação para isso; hoje o texto promete um aviso que o spec não descreve. | Evita conflito com PRs abertos e não mexe em F-031 sem sua autorização. | Adiar |

### 2.8 Outros

| ID | Onde / quando aparece | Texto atual | Proposta | Por quê | Ação |
|---|---|---|---|---|---|
| M-65 | `perfil/configuracoes/page.tsx:61`. | "Para trocar o e-mail, fale com o suporte." | **Decidir** | Não existe canal de suporte (Contato é a D-012; e-mail ao usuário depende do F-003). Hoje a frase manda a pessoa para lugar nenhum. Sugestão: "A troca de e-mail ainda não está disponível." até existir o canal. | Decidir |
| M-66 | `Header.tsx:34`. Sair de formulário preenchido. | `window.confirm`: "Sair sem publicar? Os dados preenchidos serão perdidos." · "Sair sem enviar? A mensagem escrita será perdida." | Textos mantidos | Os textos servem. O diálogo nativo não tem botões nomeados ("OK/Cancelar") e foge do padrão `ConfirmarAcao`. Trocar o componente é mudança de comportamento: proposta separada (I-08). | Manter |
| M-67 | `configuracoes/page.tsx:66` "Sair da conta?" / "Você vai precisar entrar de novo…" / "Sair" / "Cancelar". | — | — | Bom exemplo do padrão que queremos. | Manter |
| M-68 | Estados de carregamento: "Entrando...", "Enviando...", "Conectando...", "Aguarde…". | — | — | Coerentes. Mistura "..." e "…", sem impacto. | Manter |

## 3. Fluxos por tipo de conta

| Fluxo | Onde está | Observação |
|---|---|---|
| Profissional de saúde | Cadastro `cadastro/profissional`; modal M-01; rotas `/oportunidades`, `/empresas`, `/perfil`; erros de interesse M-34; foto M-60/62 | Ao tentar `/demandas` ou `/assinatura` o `ApenasPara` **redireciona sem mensagem**. Não proponho aviso (mudaria o fluxo validado em V-006). |
| Empresa / clínica / hospital / home care | `cadastro/empresa`; limites M-41 a M-48; assinatura M-50 a M-55; demandas M-30/33 | Nome do tipo na tela: "Empresa Home Care", "Clínica", "Hospital". |
| Pessoa física / família | Mesmo cadastro (`pessoa_fisica`); mesmas regras de limite | Várias frases dizem "empresa" para quem pode ser uma pessoa (M-51). Usei "empresa ou pessoa", que é o rótulo do login. |

## 4. Inconsistências de comportamento (não corrigidas aqui; correção separada)

| ID | O que acontece | Evidência | Proposta |
|---|---|---|---|
| I-01 | A tela de login decide mostrar o link "Se ainda não tem cadastro" olhando se o **texto** do erro começa com "E-mail ou senha incorretos". | `entrar/page.tsx:119` | Necessário tratar junto com M-03: comparar com uma constante exportada. Não muda o comportamento. |
| I-02 | `PERFIL_NAO_CONCLUIDO` manda "sair e entrar novamente para finalizar o cadastro", mas nada no login chama `syncProfile`. O cadastro grava o usuário no Supabase **antes** de chamar a API; se a API cair nesse intervalo (Render dorme ~15 s), sobra um usuário sem perfil que não consegue concluir nem recadastrar (o e-mail "já existe"). No caso de confirmação de e-mail pendente, o perfil também não é criado. | `supabase-client.ts:110`, `cadastro/*/page.tsx`, `use-current-user.ts:75` | Bug novo (`B-016`): completar o perfil no primeiro login a partir de `user_metadata`, ou oferecer "Concluir cadastro". Mexe em autenticação: precisa de análise própria. |
| I-03 | Se o projeto Supabase exige confirmação de e-mail, `signUp` com e-mail já existente devolve sucesso falso e o `signIn` seguinte falha com "E-mail ou senha incorretos." — na tela de **cadastro**. Se não exige, mostra "Este e-mail já tem cadastro" (que revela a existência da conta). Não consegui ler a configuração do projeto. | `erros-auth.ts`, `signUpAndEnsureSession` | Conferir a configuração no painel e decidir se o cadastro pode revelar. Texto fica como está até lá. |
| I-04 | 401 mostra "Sua sessão expirou" em linha vermelha, sem levar ao login nem oferecer botão. O guard só redireciona quando a sessão some por completo. | `painel/layout.tsx`, `api.ts` | Item novo: tratar 401 com ação "Entrar". |
| I-05 | Mudar o status de uma demanda que já expirou/encerrou (`transicao_invalida`) **reverte a lista em silêncio**. Esconde um erro relevante. | `demandas/page.tsx:70` | Item novo: mostrar M-37 e recarregar a lista. |
| I-06 | O aviso diz "Seu limite renova em 1º de novembro", mas a cota é do mês em **UTC**: zera às 21h de Brasília do último dia (D-006, em aberto). | `limite-plano.ts:434`, `entitlements.py:inicio_do_mes` | Decidir D-006; o texto acompanha. |
| I-07 | O coração "Favoritar" do perfil público troca de cor e **não grava nada**. | `profissional/[id]/page.tsx:73` | Item novo: remover ou implementar (hoje é recurso que parece existir e não existe). |
| I-08 | Sair de formulário usa `window.confirm` (nativo), diferente do `ConfirmarAcao`. | `Header.tsx:34` | Proposta separada. |
| I-09 | `AvisoDialogo` não tem botão de cancelar e o `AlertDialog` não fecha por clique fora. | `AvisoDialogo.tsx` | Resolvido em M-01/M-02 com `rotuloSecundario` opcional. |
| I-10 | `<input accept="image/*">` deixa escolher HEIC (iPhone), que o backend recusa. | `perfil/page.tsx:76` vs `profile_service.py` | Item novo: `accept="image/jpeg,image/png,image/webp"`. |
| I-11 | "Acessar profissionais verificados" em `/empresa/planos` e o selo "Verificado" afirmam algo que a F-031 ainda não entregou na `main`. | `planos/page.tsx`, `profissional/[id]/page.tsx:157` | Já tratado na branch da F-031 parte B; não mexer. |

## 5. O que preciso que você decida

1. **Aprovar a tabela** (todas, ou diga quais IDs ficam de fora).
2. **Terminologia "Proposta" × "Mensagem"** (M-31): troco para "Mensagem enviada / Enviar mensagem"?
3. **Backend:** aceita mudar as frases do backend (M-19, 20, 22, 37, 47 a 52, 56, 60, 61), com atualização de 2 testes? Alternativa: só o frontend, e o texto do backend permanece até uma rodada própria.
4. **Testes do frontend:** não há runner. Posso (a) adicionar `vitest` como devDependency para testar as funções puras (`mensagens`, `erros-auth`, `ApiError`, `limite-plano`, validações), ou (b) testar só no navegador e por scripts em Node descartáveis, sem nova dependência. Recomendo (a).
5. **M-21 e M-65** (perfil não concluído; "fale com o suporte"): sem canal de suporte, qual texto usar?
6. **I-02, I-04, I-05, I-07, I-10** viram itens do `nextmove.md` (B-016 em diante)?
