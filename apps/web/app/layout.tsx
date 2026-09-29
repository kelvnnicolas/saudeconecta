import type { Metadata } from "next";
import { Inter, Quicksand } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: "SaúdeConecta",
  description: "Marketplace que conecta profissionais de saúde a empresas e famílias.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${quicksand.variable}`}>
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
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
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
