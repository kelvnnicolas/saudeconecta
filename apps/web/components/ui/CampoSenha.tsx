"use client";

import { forwardRef, useState } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { REGRAS_SENHA } from "@/lib/validations/senha";

const CLASSE_CAMPO =
  "h-12 w-full pl-space-md pr-12 rounded-xl bg-surface-container-lowest neu-inset-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary";

/** Campo de senha com botão de mostrar/ocultar. Aceita as props do `register` do React Hook Form. */
export const CampoSenha = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function CampoSenha({ className = "", ...props }, ref) {
    const [visivel, setVisivel] = useState(false);
    return (
      <div className="relative">
        <input ref={ref} type={visivel ? "text" : "password"} className={`${CLASSE_CAMPO} ${className}`} {...props} />
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant"
        >
          <MaterialIcon name={visivel ? "visibility_off" : "visibility"} className="text-[20px]" />
        </button>
      </div>
    );
  },
);

/** Lista do que a senha já cumpre e do que ainda falta, atualizada enquanto a pessoa digita. */
export function ChecklistSenha({ senha }: { senha: string }) {
  return (
    <ul className="flex flex-col gap-0.5" aria-label="Requisitos da senha">
      {REGRAS_SENHA.map((regra) => {
        const ok = regra.ok(senha);
        return (
          <li
            key={regra.id}
            className={`flex items-center gap-1.5 font-caption text-caption ${ok ? "text-secondary" : "text-on-surface-variant"}`}
          >
            <MaterialIcon name={ok ? "check_circle" : "radio_button_unchecked"} filled={ok} className="text-[16px]" />
            <span>
              {regra.rotulo}
              <span className="sr-only">{ok ? " — cumprido" : " — falta"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
