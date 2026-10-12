import Link from "next/link";

export function RodapeLanding() {
  return (
    <footer className="max-w-6xl w-full mx-auto px-gutter md:px-gutter-lg py-space-lg flex flex-wrap gap-space-md font-caption text-caption text-on-surface-variant">
      <Link href="/sobre">Sobre</Link>
      <Link href="/contato">Contato</Link>
      <Link href="/ajuda">Ajuda</Link>
      <Link href="/seguranca">Segurança</Link>
      <Link href="/privacidade">Privacidade</Link>
      <Link href="/termos">Termos</Link>
    </footer>
  );
}
