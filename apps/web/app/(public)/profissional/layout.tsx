import { CascaDaNavegacao } from "@/components/navegacao/CascaDaNavegacao";

// Perfil público: visitante vê como sempre; quem está logado ganha a navegação do app.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CascaDaNavegacao>{children}</CascaDaNavegacao>;
}
