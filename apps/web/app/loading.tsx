import { PaginaEsqueleto } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 pt-space-md px-gutter pb-24 bg-surface min-h-screen">
      <PaginaEsqueleto />
    </main>
  );
}
