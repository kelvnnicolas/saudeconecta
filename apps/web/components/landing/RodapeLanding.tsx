import Link from "next/link";

// Só links para páginas que existem (B-011). Sobre, Contato, Ajuda, Segurança, Privacidade
// e Termos voltam quando houver texto (D-012); termos jurídicos não são escritos aqui.
const LINKS = [
  { href: "/empresa/planos", rotulo: "Planos para empresas" },
  { href: "/cadastro/profissional", rotulo: "Sou profissional de saúde" },
  { href: "/entrar", rotulo: "Entrar" },
];

export function RodapeLanding() {
  return (
    <footer className="max-w-6xl w-full mx-auto px-gutter md:px-gutter-lg py-space-lg flex flex-col gap-space-sm md:flex-row md:items-center md:justify-between font-caption text-caption text-on-surface-variant">
      <nav aria-label="Rodapé" className="flex flex-wrap gap-x-space-md">
        {LINKS.map((link) => (
          <Link prefetch={false}
            key={link.href}
            href={link.href}
            className="inline-flex min-h-11 items-center hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {link.rotulo}
          </Link>
        ))}
      </nav>
      <span>© {new Date().getFullYear()} SaúdeConecta</span>
    </footer>
  );
}
