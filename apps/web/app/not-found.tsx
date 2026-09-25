import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-space-md bg-surface min-h-screen px-gutter text-center">
      <MaterialIcon name="search_off" className="text-[56px] text-outline" />
      <h1 className="font-headline-md text-headline-md text-on-surface">Página não encontrada</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
        O link que você acessou não existe ou foi movido.
      </p>
      <div className="flex items-center gap-space-sm">
        <Link href="/" className="px-space-md h-11 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center">
          Ir para a home
        </Link>
        <Link href="/buscar" className="px-space-md h-11 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md flex items-center">
          Buscar profissionais
        </Link>
      </div>
    </main>
  );
}
