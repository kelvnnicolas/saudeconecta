import { HeaderLanding } from "@/components/landing/HeaderLanding";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { SecaoEmpresas } from "@/components/landing/SecaoEmpresas";
import { PerfisContratante } from "@/components/landing/PerfisContratante";
import { ChamadaEmpresa } from "@/components/landing/ChamadaEmpresa";
import { ComoFunciona } from "@/components/landing/ComoFunciona";
import { SecaoProfissionais } from "@/components/landing/SecaoProfissionais";
import { RodapeLanding } from "@/components/landing/RodapeLanding";

// Estrutura inspirada em landings B2B de saúde (hero em foto cheia, header em
// pílula, captação em etapas, cards por tipo de cliente). Regra do projeto:
// nenhum número sem lastro — sem contagem de usuários, logos de parceiros ou
// métricas de resultado até existirem dados reais.

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col bg-surface">
      <HeaderLanding />
      <HeroLanding />
      <SecaoEmpresas />
      <PerfisContratante />
      <ChamadaEmpresa />
      <ComoFunciona />
      <SecaoProfissionais />
      <RodapeLanding />
    </main>
  );
}
