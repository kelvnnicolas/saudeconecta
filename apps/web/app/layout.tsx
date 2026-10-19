import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fontes hospedadas no projeto (app/fonts/, subconjunto latino das variáveis do Google Fonts,
// licença OFL). Com `next/font/google` o build buscava o CSS no Google duas vezes e, quando as
// respostas diferiam, as classes do <html> e do CSS saíam com nomes diferentes: o site inteiro
// caía em Times em produção (B-013). Arquivo local = build determinístico e sem rede.
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
});
const quicksand = localFont({
  src: "./fonts/quicksand-latin.woff2",
  weight: "600 700",
  style: "normal",
  display: "swap",
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: "SaúdeConecta",
  description: "Marketplace que conecta profissionais de saúde a empresas e famílias.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning em <html>: o script do tema grava `data-theme` antes de o React
  // hidratar; sem isso o React avisa "Extra attributes from the server" em toda página (T-015).
  // Vale só para os atributos deste elemento, não para os filhos.
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${quicksand.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Roda antes da hidratação/pintura pra aplicar o tema salvo (ou o
            padrão "light") sem flash. A UI de escolha mora só em /perfil
            (ThemeSettings), mas a aplicação do tema precisa acontecer em
            toda página — sem isso, qualquer tela fora de /perfil nunca
            inicializa o atributo e cai no prefers-color-scheme cru do
            navegador, ignorando o padrão light. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("saudeconecta:theme");var t=(s==="dark"||s==="system")?s:"light";if(t!=="system")document.documentElement.setAttribute("data-theme",t);if(s!==t)localStorage.setItem("saudeconecta:theme",t);}catch(e){}})();`,
          }}
        />
        {/* Fonte de ícones hospedada no projeto (ver app/globals.css e T-016). */}
        <link
          rel="preload"
          href="/fonts/material-symbols-outlined.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
      </head>
      <body className="bg-surface font-body-md text-body-md text-on-surface flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
