# Escopo por plano e limites de implementação — SaúdeConecta

> **Função:** fronteira entre o que foi contratado e o que é venda futura. Nenhum recurso
> marcado como **🔒 Bloqueado** pode ser implementado, nem parcialmente, até ser liberado
> conforme a seção 1. Vale para pessoas e para agentes (Claude Code, Kilo etc.).
>
> **Referências:** proposta comercial e contrato (Anexo I) aprovados pela cliente; spec do
> MVP em `docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md`; estado em
> `STATUS.md`; fila em `nextmove.md`.
>
> **Última revisão:** 2026-10-22 · seção 2.5 (perfil e configurações) e propostas M-AUT-3 e M-COM-5.
> Comparação da linha de base feita sobre a `main` em `522b0ff` (2026-10-14).

**Legenda de status**

| Status | Significado |
|---|---|
| ✅ Incluído | Faz parte do plano contratado |
| 🎁 Cortesia | Entregue além do contratado; não gera obrigação de evolução |
| 🔒 Bloqueado | Pertence a plano ou módulo não contratado; não implementar |
| 🟢 Liberado | Contratado e com pagamento confirmado; pode ser implementado |
| 🚧 Em execução / ✔️ Entregue | Acompanhar no `nextmove.md` e no `STATUS.md` |

---

## 1. Regra de liberação

1. **Contratado = Plano Essencial.** Tudo fora da seção 2.1 está bloqueado até liberação.
2. **Liberação de um plano ou módulo** exige as duas coisas, registradas na seção 7:
   - aditivo ou novo contrato assinado com o escopo do item; e
   - pagamento da 1ª parcela confirmado.
   A entrega, o aceite e a 2ª parcela seguem as cláusulas 2 e 3 do contrato.
3. **Planos mensais** (Manutenção, Evolução, Growth): itens de backlog só entram enquanto
   a mensalidade estiver em dia e dentro do limite de horas do plano (definir no contrato
   de manutenção).
4. **Garantia de 60 dias:** correção de defeito em recurso já entregue, inclusive cortesia,
   não precisa de liberação. Melhoria não é defeito.
5. **Pedido novo fora deste catálogo:** entra na seção 5 como **Proposto**, é orçado e só
   então segue a regra 2.
6. **Em caso de dúvida, o item está bloqueado.** Pergunte antes de implementar.

---

## 2. Linha de base: Essencial contratado × projeto construído

### 2.1 Itens do Essencial (obrigação contratual)

| Item do Anexo I | Status | Situação em 2026-10-14 |
|---|---|---|
| Cadastro e login de profissionais e contratantes | ✅ | E-mail, recuperação de senha e senha forte |
| Perfis com especialidades, registro, região e valor | ✅ | Registro opcional; selo só por conferência manual (F-031). Upload de foto sem reconfirmação no Storage (V-003). Edição pelo próprio usuário e configurações da conta: ver 2.5 |
| Busca com filtros (especialidade, cidade, preço, avaliação) | ✅ | `/buscar` |
| Demandas publicadas por empresas e interesse de profissionais | ✅ | Regra de negócio mudou, ver 2.4 |
| Contato e avaliação mútua | ✅ | Bug: mesma pessoa avaliada várias vezes (B-008) |
| Assinatura mensal para empresas (cartão, na conta da contratante) | 🟡 | Validada só em modo de teste, em conta Stripe que não é a da cliente |
| Publicação no domínio da contratante | ❌ | Está em `saudeconecta-pi.vercel.app` |
| Treinamento de uso | ❌ | Não realizado |
| Suporte de 60 dias | — | Começa no aceite da entrega |
| Relatório básico (spec, item 9) | ✅ | `GET /analytics/relatorio`, hoje público (B-007) |

### 2.2 Pendências para fechar o Essencial

Estas são obrigação, não venda. Não dependem de liberação.

- Stripe na conta da cliente, em modo produção (produtos, preços, webhook, `sk_live_`).
- Domínio da cliente e URLs de retorno no Supabase e no Stripe.
- Bugs: B-003 (link de nova senha), B-004 (link de confirmação), B-007 (relatório público), B-008 (avaliação repetida), B-012 (job de expiração).
- E-mail de novo contato com domínio configurado no Resend (F-003): o spec previa
  "contato registra mensagem e notifica por e-mail".
- Lint e checagem de tipos do frontend no CI (T-001): o spec previa CI com lint.
- Política de senha também no servidor (T-010).
- Verificações V-002 (Sentry) e V-003 (Storage).
- Treinamento e roteiro de aceite com a cliente.

**Risco interno, sem custo para a cliente:** o `.env` de desenvolvimento aponta para o
banco de produção (T-008). Resolver antes de entregar.

### 2.3 Entregue além do Essencial (cortesia)

Já está em produção. Recomendação: **manter, declarar à cliente por escrito como cortesia
da versão inicial e congelar** (sem evolução fora de plano).

| Recurso | Onde ficaria se fosse vendido | Observação |
|---|---|---|
| Chat por contato com histórico e aceite de demanda direta | Módulo M-COM | O contrato exclui "chat em tempo real"; o atual atualiza a cada 7 s |
| Notificações no app (sino) | Módulo M-COM | Atualiza a cada 20 s |
| Diretório de empresas para profissionais (`/empresas`) | Módulo M-OFE | |
| Plano gratuito, cota mensal e segundo plano pago (Pro) com avisos de limite | Decisão comercial da cliente | Ver 2.4 |
| Login com Google e Facebook | Módulo M-AUT | LinkedIn com código pronto, sem configuração |
| Tema escuro | Cortesia de UX | Reapresentação do controle em Configurações autorizada em 2026-10-22 (2.5); sem comportamento novo e congelado de novo depois da entrega |
| Landing B2B elaborada (abas, simulação de chat, carrossel, animações, vidro) | Cortesia de UX | |
| Rate limiting, `/ready`, Dependabot, auto-deploy, job de expiração | Fronteira com P-03 | Higiene básica; não vender de novo como "segurança reforçada" |

### 2.4 Divergências com o texto aprovado (alinhar com a cliente)

1. **Publicar demanda deixou de exigir assinatura.** O Anexo I fala em "demandas por
   empresas assinantes"; hoje o plano gratuito publica até 5 por mês (decisão 15).
2. **Pessoa física e família publicam e assinam** (decisão 25). A proposta posicionava a
   assinatura para clínicas, hospitais e home care.
3. **Dois planos pagos com cota mensal** (Essencial 50, Pro ilimitado). Preço e limites
   são decisão comercial da cliente.
4. **Link de pagamento por contato** (spec, item 8) está adiado. É coerente com o contrato,
   que põe pagamento de atendimentos no Profissional (P-01).

Nada disso deve ser revertido sem a cliente; só confirmado e registrado.

### 2.5 Perfil e configurações da conta (enquadramento de 2026-10-22)

Definido pelo responsável do projeto em 2026-10-22. Não é liberação de item bloqueado (não
há aditivo), por isso não entra na seção 7: é o detalhamento do que o item ✅ "Perfis com
especialidades, registro, região e valor" cobre. Execução no `nextmove.md` (F-035, F-036);
desenho em `docs/superpowers/specs/2026-10-22-perfil-configuracoes-design.md`.

| Recurso | Status | Limite |
|---|---|---|
| Ver o próprio perfil completo (dados pessoais, contato, profissionais ou da empresa) | ✅ Incluído | Telefone visível só para o dono |
| Editar nome, telefone, cidade e UF | ✅ Incluído | E-mail só leitura enquanto o B-004 existir |
| Editar bio, especialidades, preço por hora e registro (profissional) | ✅ Incluído | Mudar o registro tira o selo até nova conferência (F-031) |
| Editar nome fantasia e tipo (empresa) | ✅ Incluído | |
| Trocar a foto | ✅ Incluído | Já entregue |
| Tela de configurações (`/perfil/configuracoes`) com conta e sair | ✅ Incluído | |
| Aviso ao sair com alterações não salvas (F-004) | ✅ Incluído | |
| Controle de aparência reapresentado em Configurações (F-036) | 🎁 Cortesia | Só lugar e formato; sem tema novo nem preferência sincronizada entre aparelhos |
| Alterar senha estando logado | ❓ A decidir | D-019 no `nextmove.md`; enquadramento candidato: "Cadastro e login" |
| Telefone visível a outros usuários | 🔒 Bloqueado | Contornaria a cota mensal; ver M-COM-5 |
| Troca de e-mail pelo próprio usuário | 🔒 Bloqueado até o B-004 | Depende do link de confirmação no domínio certo |
| Excluir a própria conta | 🔒 Bloqueado | Ver M-AUT-3 |

---

## 3. Plano Profissional — R$ 9.500 · 🔒 Bloqueado

### P-01 · Pagamento do atendimento pela plataforma
- **O quê:** a contratante paga o atendimento dentro do app; o valor é liberado ao
  profissional depois da confirmação em duas etapas.
- **Fluxo:** contato confirmado → serviço realizado (contratante confirma) → pagamento
  liberado (gateway confirma) → concluído (libera avaliação).
- **Como:** split com recebedores do gateway (Stripe Connect ou Pagar.me). A plataforma
  nunca custodia o dinheiro.
- **Pré-requisito obrigatório:** avaliação regulatória paga pela cliente (cláusula 6.3) e
  D-001 decidida. Sem isso o item não é liberado nem com pagamento.
- **Absorve:** F-010.

### P-02 · Painel de indicadores do negócio
- **O quê:** painel para a dona da plataforma com cadastros, demandas, contatos, conversão,
  assinaturas ativas, receita mensal recorrente e cancelamentos.
- **Depende de:** papel de administrador e D-010.
- **Absorve:** B-007 na forma definitiva (relatório só para admin); a parte interna de F-008.

### P-03 · Segurança reforçada e publicação automatizada
Definição concreta do que é vendido, além da higiene do 2.3:
- Ambiente de homologação com banco próprio e deploy de prévia por PR (D-003).
- Migrations aplicadas no deploy (T-007).
- Backup com teste de restauração documentado.
- Alerta de disponibilidade e de erro (uptime e Sentry com regras).
- RLS nas tabelas antigas, inclusive `contatos` (decisão 1).
- Revisão de dependências e de cabeçalhos de segurança.
- Plano pago de hospedagem sem cold start (D-004; custo da cliente).

### P-04 · Acompanhamento estratégico mensal
- Serviço, não código: reunião mensal com indicadores, priorização do backlog e
  recomendações. Definir duração e entregável (ex.: 1 h + relatório de 1 página).

---

## 4. Plano Premium — R$ 14.500 · 🔒 Bloqueado

Inclui todo o Profissional, mais:

### PR-01 · Recomendação inteligente de profissionais
- **Fase 1, regras:** pontuação por especialidade, cidade, avaliação, histórico de
  resposta e disponibilidade; mostra "profissionais recomendados" na demanda.
- **Fase 2, aprendizado:** modelo treinado (scikit-learn) com o histórico de contatos e
  aceites. Só quando houver volume mínimo de dados (definir, ex.: 500 contatos concluídos).
- **Regra:** a recomendação nunca esconde resultados orgânicos e não aceita pagamento para
  subir posição.
- **Depende de:** P-02 (dados) e PR-02.

### PR-02 · Métricas públicas de confiança
- Demandas concluídas, tempo de resposta em faixas e taxa de conclusão, exibidos só com
  amostra mínima. **Absorve:** parte pública de F-008.

---

## 5. Módulos avulsos (orçamento por aditivo) · 🔒 Bloqueado

Porte é estimativa de esforço relativo, não preço: **P** até 1 semana, **M** 1 a 3
semanas, **G** acima de 3 semanas.

### M-FT · Força de trabalho em saúde (maior valor para clínicas e home care)
| ID | Recurso | Porte | Depende de |
|---|---|---|---|
| M-FT-1 | Escalas e plantões recorrentes | G | — |
| M-FT-2 | Confirmação de presença (check-in) e registro de faltas | M | M-FT-1 |
| M-FT-3 | Substituição rápida: demanda urgente para compatíveis | M | M-FT-1 |
| M-FT-4 | Custo por equipe e por período | M | M-FT-1, P-02 |
| M-FT-5 | Vários usuários por empresa (RH, coordenação) com permissões | M | — |

### M-CON · Confiança e moderação
| ID | Recurso | Porte | Depende de |
|---|---|---|---|
| M-CON-1 | Papel de administrador | M | — |
| M-CON-2 | Validação de registro profissional com selo (F-015) | M | D-009, M-CON-1 |
| M-CON-3 | Reputação de empresas com avaliação cega e média bayesiana (F-007) | M | D-002 |
| M-CON-4 | Denúncias e moderação | M | M-CON-1 |
| M-CON-5 | Mensagens do administrador para usuários (F-006) | P | M-CON-1 |

### M-OFE · Oferta do profissional
| ID | Recurso | Porte | Depende de |
|---|---|---|---|
| M-OFE-1 | Oferta publicada pelo profissional (F-014) | M | D-008 |
| M-OFE-2 | Disponibilidade e agenda do profissional | M | — |
| M-OFE-3 | Oferta direta estruturada (turno, data, valor, aceite em um toque) | P | — |
| M-OFE-4 | Destaque pago de perfil, rotulado "Patrocinado", só para verificados | M | M-CON-2, P-01 ou cobrança própria |

### M-COM · Comunicação
| ID | Recurso | Porte | Depende de |
|---|---|---|---|
| M-COM-1 | Chat em tempo real (Supabase Realtime ou SSE) | M | — |
| M-COM-2 | Preferências de notificação por tipo e canal (F-009) | P | — |
| M-COM-3 | Aviso de limite por notificação e e-mail (F-024) | P | — |
| M-COM-4 | WhatsApp com opt-in | M | Provedor aprovado pela Meta |
| M-COM-5 | Telefone compartilhado só dentro de um contato aceito (proposto em 2026-10-22) | P | Regra de cota definida pela cliente |

### M-BUS · Busca e descoberta
| ID | Recurso | Porte | Depende de |
|---|---|---|---|
| M-BUS-1 | Busca por distância (PostGIS) | M | — |
| M-BUS-2 | Favoritos e equipes salvas | P | — |

### M-AUT · Acesso
| ID | Recurso | Porte | Depende de |
|---|---|---|---|
| M-AUT-1 | Login com LinkedIn | P | Configuração externa |
| M-AUT-2 | Login social respeitando o tipo de conta (T-013) | P | — |
| M-AUT-3 | Exclusão da própria conta, com regra de retenção de avaliações, contatos e assinatura (proposto em 2026-10-22) | M | Revisão de LGPD |

### M-APP · Canais
| ID | Recurso | Porte | Depende de |
|---|---|---|---|
| M-APP-1 | PWA instalável com notificação push | M | — |
| M-APP-2 | Apps nas lojas (Android e iOS) | G | M-APP-1 validado |

### M-FIN · Faturamento
| ID | Recurso | Porte | Depende de |
|---|---|---|---|
| M-FIN-1 | Plano anual com desconto e cupons | P | — |
| M-FIN-2 | Boleto e Pix recorrentes | M | Suporte do gateway |
| M-FIN-3 | Emissão de nota fiscal | M | Contador e provedor de NF |

### M-PAC · Jornada do paciente (longo prazo)
Agendamento com lembretes, confirmação de consulta e integração com prontuário eletrônico
existente. Exige assessoria regulatória (CFM e LGPD para dado de saúde). **Não construir
prontuário próprio.** Só avaliar com tração comprovada e investimento dedicado.

### Conteúdo (fora do desenvolvimento)
Termos de Uso, Política de Privacidade e páginas institucionais (D-012): texto fornecido
pela cliente; o desenvolvimento só publica.

---

## 6. Planos mensais após o suporte

| Plano | Mensalidade | O que pode entrar |
|---|---|---|
| Manutenção | R$ 490 | Correções, atualizações de dependências, monitoramento, dívidas técnicas (T-###) |
| Evolução | R$ 890 | Manutenção + itens **P** dos módulos, dentro do limite de horas |
| Growth | R$ 1.490 | Evolução + itens de indicadores, SEO e crescimento |

Itens **M** e **G** sempre por aditivo, mesmo com plano mensal ativo.

---

## 7. Registro de liberações

Preencher a cada aditivo. Não registrar dados bancários, só a confirmação.

| Data | Item(s) | Documento (aditivo/contrato) | 1ª parcela confirmada | Registrado por |
|---|---|---|---|---|
| | | | | |

---

## 8. Instrução para agentes

A regra que os agentes seguem está no `agents.md`, seção 2. Resumo: item 🔒 Bloqueado ou
fora deste arquivo não é implementado; só o responsável do projeto muda um status para
🟢 Liberado e preenche a seção 7; agentes nunca editam status nem o registro de liberações.
