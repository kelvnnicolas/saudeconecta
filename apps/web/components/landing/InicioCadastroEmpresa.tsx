"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { guardarEmailCadastro } from "@/lib/cadastro-prefill";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Primeiro passo do cadastro de empresa, direto na landing: só o e-mail.
 * Pedir um campo só reduz o atrito do primeiro clique; o resto do formulário
 * abre em /cadastro/empresa já com o e-mail preenchido.
 */
export function InicioCadastroEmpresa() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function continuar(e: React.FormEvent) {
    e.preventDefault();
    const valor = email.trim();
    if (!EMAIL_VALIDO.test(valor)) {
      setErro("Informe um e-mail válido, como nome@empresa.com.br.");
      return;
    }
    guardarEmailCadastro(valor);
    router.push("/cadastro/empresa");
  }

  return (
    <form onSubmit={continuar} noValidate className="flex flex-col gap-space-sm">
      <label htmlFor="email-empresa" className="font-label-md text-label-md text-on-surface">
        E-mail profissional
      </label>
      <input
        id="email-empresa"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (erro) setErro(null);
        }}
        placeholder="nome@empresa.com.br"
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? "email-empresa-erro" : undefined}
        className="h-12 px-space-md rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline neu-inset-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {erro && (
        <span id="email-empresa-erro" className="font-caption text-caption text-error">
          {erro}
        </span>
      )}

      <div className="flex items-center gap-space-sm mt-1" aria-hidden="true">
        <div className="h-1.5 flex-1 rounded-full bg-on-surface/10 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-primary" />
        </div>
        <span className="font-caption text-caption text-on-surface-variant">Passo 1 de 2</span>
      </div>

      <button
        type="submit"
        className="mt-1 self-start h-12 px-space-lg rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center gap-space-xs shadow-lg shadow-primary/25 transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Continuar cadastro
        <MaterialIcon name="arrow_forward" className="text-[18px]" />
      </button>
    </form>
  );
}
