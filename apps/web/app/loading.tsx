import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function Loading() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-space-md bg-surface min-h-screen px-gutter text-center">
      <MaterialIcon name="progress_activity" className="text-[40px] text-primary animate-spin" />
      <p className="font-body-md text-body-md text-on-surface-variant">Carregando SaúdeConecta...</p>
    </main>
  );
}
