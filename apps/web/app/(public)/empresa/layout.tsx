import { ApenasPara } from "@/components/ui/ApenasPara";
import { CascaDaNavegacao } from "@/components/navegacao/CascaDaNavegacao";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ApenasPara papel="empresa" permitirVisitante>
      <CascaDaNavegacao>{children}</CascaDaNavegacao>
    </ApenasPara>
  );
}
