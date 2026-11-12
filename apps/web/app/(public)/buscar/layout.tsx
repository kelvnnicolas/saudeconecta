import { CascaDaNavegacao } from "@/components/navegacao/CascaDaNavegacao";

// Pública: visitante vê a página como sempre; quem está logado ganha a navegação do app.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CascaDaNavegacao>{children}</CascaDaNavegacao>;
}
