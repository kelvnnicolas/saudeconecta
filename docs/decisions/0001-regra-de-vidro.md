# 0001 · Regra de vidro (Liquid Glass) para botões, barras e cartões sobre imagem

**Data:** 2026-10-12 · **Estado:** adotada

## Problema

Na landing no celular, cartões brancos e opacos ficavam sobre a foto escura do hero e quebravam o visual. A regra de cada componente era decidida na hora.

## Decisão

Toda superfície que flutua (barra, botão, cartão de acesso) usa **uma de três famílias de vidro**, definidas no `app/globals.css` com as variáveis de tema. Nunca cor solta no componente.

| Classe | Onde usar | Aparência |
|---|---|---|
| `.vidro` (`.vidro-topo`, `.vidro-base` para barras fixas) | Sobre a superfície do tema | Translúcido do tom do tema, desfoque forte, borda e brilho finos no alto |
| `.vidro-midia` | Sobre foto ou fundo escuro (hero) | Branco a 10%, texto sempre branco |
| `.vidro-acento` | A ação principal de uma área | Cor de destaque a 80%, texto `accent-ink` |

## Regras

1. **Branco opaco nunca fica sobre mídia escura.** Cartão `neu-surface` (opaco) só existe sobre a superfície do tema.
2. **Uma ação principal por área**, em `.vidro-acento`. As demais são `.vidro` ou `.vidro-midia`.
3. **Texto sobre foto:** branco, com degradê escuro por baixo (mínimo de 70% de opacidade na faixa do texto) e contraste AA.
4. **Movimento:** só `transform`, `opacity` e cor, de 150 a 300 ms. Hover apenas em aparelhos com mouse (`@media (hover: hover)`). Movimento reduzido já é tratado no `globals.css`.
5. **Sem suporte a `backdrop-filter`:** o próprio CSS cai para fundo quase opaco, para manter o contraste.
6. **Tema:** claro e escuro usam as mesmas classes; só mudam as variáveis `--vidro-*`. Qualquer tela nova tem que ser conferida nos dois temas.

## Consequências

- Os dois temas continuam. Se, depois de conferir as telas, um deles ficar claramente abaixo do outro em qualidade, abrir uma decisão para remover o pior.
- Componentes antigos (`neu-surface` nos cartões do painel) não mudam por causa desta regra; ela vale para barras, botões e o que flutua sobre mídia.
