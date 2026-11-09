# 0002 · Biblioteca de componentes, animações e plugins de UI

**Data:** 2026-10-22 · **Estado:** **adotada em parte** em 2026-10-22: Radix UI para comportamento (seção 1) e animação em CSS (seção 4). Toasts, gaveta e plugins (seções 2, 3 e 5) seguem como proposta.

**Primeiro uso:** `components/ui/ThemeSettings.tsx` (`@radix-ui/react-radio-group`) e `components/ui/ConfirmarAcao.tsx` (`@radix-ui/react-alert-dialog`), na fase 1 do F-035. Peso medido no `next build`: `/perfil/configuracoes` 186 kB no primeiro carregamento (o Radix fica só nessa rota); `/perfil` e o JavaScript compartilhado (87,4 kB) sem mudança.

## Contexto

Foi avaliado o uso do **Preline UI**, instalado globalmente via npm na máquina do responsável, para melhorar a UI e a UX do app (perfil e configurações do F-035/F-036 primeiro).

Estado do frontend (conferido em 2026-10-22):

- Next.js 14, React 18 e **Tailwind 3.4**. A migração para Tailwind 4 está travada pelo Next 14 (T-024).
- Nenhuma biblioteca de UI: só `react-hook-form`, `zod` e `supabase-js`.
- Sistema visual próprio: tokens em `globals.css` (claro e escuro pelas mesmas variáveis), relevo `neu-*`, vidro `.vidro*` (decisão 0001), curva `--mola` e movimento reduzido já tratado.
- Três componentes interativos com teclado e foco feitos à mão, cada um com a sua cópia da lógica: `ModalLimite` (prende o foco e fecha com Esc), `NotificationBell` (Esc) e o menu do `HeaderLanding` (Esc e foco).
- Gargalo de desempenho conhecido: a hidratação do JavaScript no celular (T-017). Todo JavaScript a mais no carregamento piora o LCP.

## Avaliação do Preline

| Critério | Resultado |
|---|---|
| Versão com Tailwind 3 | O Preline passou para **Tailwind 4 na v3.0** (mar/2025); a atual é a v5 (ago/2026). Com Tailwind 3 só serve a **2.7**, que está parada e não recebe correções |
| Instalação global | Não serve ao projeto: a Vercel só instala o que está no `package.json` de `apps/web` |
| Como funciona | Plugins em JavaScript puro que mexem no DOM direto (`data-hs-*`). No Next exige reinicializar a cada troca de rota (`cleanCollection()` e `autoInit()`), fora do ciclo do React. Risco de estado duplicado e de quebra na hidratação |
| Visual | Tem estética própria (bordas, cinzas, azul). Choca com o relevo `neu-*` e o vidro; cada bloco teria de ser repintado com os nossos tokens |
| Formulários | Os componentes de formulário pedem `@tailwindcss/forms`, que reseta **todos** os inputs do app (regressão visual em todas as telas) |
| Peso | Mais JavaScript no carregamento, contra o T-017 |

**Conclusão:** não adotar o Preline como dependência. Usá-lo como **catálogo de referência** (o markup gratuito é MIT): olhar o padrão de um componente (abas, controle segmentado, gaveta, toast), reescrevê-lo em React com os nossos tokens e sem o JavaScript dele.

## Proposta

### 1. Comportamento: primitivas acessíveis em React, sem estilo

Uma biblioteca **sem visual**, que entrega teclado, foco, Esc, `aria-*` e portal, e deixa a aparência 100% nos nossos tokens:

| Opção | Prós | Contras |
|---|---|---|
| **Radix UI** (pacotes avulsos: `@radix-ui/react-dialog`, `-radio-group`, `-dropdown-menu`, `-tabs`) | Instala só o que usa; padrão de mercado; funciona com React 18 e Tailwind 3; estados viram `data-state` estilizável | Mais um fornecedor; atualizar pacote a pacote |
| **Headless UI** (Tailwind Labs) | Um pacote só, mesmo autor do Tailwind | Menos primitivas (sem Toast, sem Tooltip) |
| **Manter à mão**, extraindo um hook `useOverlay` (foco, Esc, devolver o foco) | Zero dependência | Continuar mantendo a acessibilidade sozinho; hoje já são três cópias |

**Adotado:** Radix, começando por `react-radio-group` (Aparência do F-036) e `react-dialog` (trocando a lógica do `ModalLimite`). O visual fica igual; só sai o código de teclado escrito à mão.

### 2. Retorno das ações: toasts

`sonner`, para "Perfil atualizado", "Notificações marcadas como lidas" e erros de rede. Pequeno e sem estilo imposto (aceita classes). Alternativa: o `Toast` do Radix, se ele já tiver sido adotado.

### 3. Gaveta inferior no celular (opcional)

`vaul`, para filtros da busca e ações do contato. Só se uma tela precisar; o F-035 não precisa (formulário em página).

### 4. Animação: continuar em CSS

Para o que o app faz (aparecer, trocar painel, relevo ao tocar, indicador do controle segmentado), CSS resolve, não pesa e já respeita o movimento reduzido. **Não adotar** `framer-motion`/`motion` agora: o ganho seria animar layout e saída de listas, e o custo é JavaScript no carregamento (T-017). Reavaliar só se uma tela precisar de animação de saída que o CSS não faça.

Ajuste proposto: transformar as durações soltas (`0.2s`, `0.3s`, `0.35s`, `0.7s`) em tokens ao lado de `--mola` (`--dur-rapida: 150ms`, `--dur-media: 250ms`, `--dur-lenta: 400ms`) e usar só eles, como já vale para as cores.

### 5. Plugins e utilitários do Tailwind 3

| Plugin | Uso | Decisão |
|---|---|---|
| `@tailwindcss/forms` com `strategy: "class"` | Base consistente de input, select e checkbox **só onde a classe `form-*` for aplicada** (sem reset global) | Opcional; só se os campos começarem a divergir |
| `tailwindcss-animate` | Classes `animate-in`, `fade-in`, `slide-in-from-bottom`, que combinam com o `data-state` do Radix | Adotar junto com o Radix |
| `@tailwindcss/container-queries` | Cartões que mudam de forma pelo tamanho do cartão, não da tela (cartão do profissional na busca e no diretório) | Opcional |
| `clsx` + `tailwind-merge` | Classes condicionais sem string montada à mão (o `ThemeSettings` e o `BottomNav` montam strings longas) | Adotar; pequenos e sem efeito no visual |

Todos são compatíveis com Tailwind 3 e não travam a migração futura para o 4 (T-024).

## Regras, se aprovada

1. Nenhuma biblioteca traz cor, sombra ou fonte própria: o visual vem dos tokens de `globals.css` e das decisões 0001 e 27 do `STATUS.md`.
2. Toda dependência nova entra num PR próprio, com o peso medido (`next build`, tamanho do JS da rota) e o Lighthouse de 3 rodadas no celular (T-017).
3. Migrar componente por componente; não reescrever telas inteiras só para usar a biblioteca.
4. Animação só em `transform`, `opacity` e cor, com tokens de duração, e sempre com o caminho do movimento reduzido (decisão 0001, regra 4).

## Consequências

- Menos código de acessibilidade escrito à mão, e o mesmo comportamento de teclado em todo o app.
- Duas a quatro dependências pequenas a manter (Dependabot já agrupa).
- O Preline não entra no `package.json`. Se um dia o projeto subir para Next 15+ e Tailwind 4 (T-024), reavaliar, mantendo o critério de não aceitar JavaScript que mexa no DOM fora do React.
