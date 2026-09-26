// Avatares enviados via POST /perfis/me/avatar vêm do Supabase Storage
// (bucket "avatars"), com URL pública em {SUPABASE_URL}/storage/v1/object/...
// — sem o hostname aqui, next/image lança em runtime ("hostname is not
// configured") e derruba a página inteira (confirmado ao vivo: /perfil
// quebrava com "Erro de conexão" assim que um avatar real era carregado).
// Wildcard em vez de ler NEXT_PUBLIC_SUPABASE_URL: nesta versão do Next.js,
// next.config.mjs carrega antes do .env.local, então process.env ainda não
// tem a variável nesse ponto — usar o subdomínio genérico evita depender
// dessa ordem de carregamento.
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
