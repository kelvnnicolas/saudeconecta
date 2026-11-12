"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { ListaEsqueleto } from "@/components/ui/Skeleton";
import { ContatoStatusBadge } from "@/components/ui/StatusBadge";
import { useCurrentUser } from "@/lib/use-current-user";
import { useContatos } from "@/lib/use-contatos";
import type { StatusContato } from "@/lib/types";

const FILTROS: { value: "todos" | StatusContato; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Aguardando resposta" },
  { value: "respondido", label: "Em andamento" },
  { value: "encerrado", label: "Concluídos" },
];

export default function MeusContatosPage() {
  const { contatos, carregando, erro, nomeDaOutraParte } = useContatos();
  const { papel } = useCurrentUser();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["value"]>("todos");
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    return contatos.filter((c) => {
      const nome = nomeDaOutraParte(c).toLowerCase();
      const bateFiltro = filtro === "todos" || c.status === filtro;
      const bateBusca = !busca || nome.includes(busca.toLowerCase()) || c.mensagem.toLowerCase().includes(busca.toLowerCase());
      return bateFiltro && bateBusca;
    });
  }, [contatos, filtro, busca, nomeDaOutraParte]);

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Mensagens</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Suas conversas com {papel === "profissional" ? "empresas e contratantes" : "profissionais"}
          </p>
        </div>

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-space-md flex items-center pointer-events-none text-outline">
            <MaterialIcon name="search" className="text-[20px]" />
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por profissional ou serviço..."
            className="w-full h-12 pl-11 pr-space-md rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline neu-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </div>

        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5">
          {FILTROS.map((f) => {
            const count = f.value === "todos" ? contatos.length : contatos.filter((c) => c.status === f.value).length;
            const ativo = filtro === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`flex-shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-label-sm transition-[background-color,color,box-shadow] ${
                  ativo ? "bg-primary text-on-primary neu-surface" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {f.label} <span className="ml-1 opacity-80 font-normal">({count})</span>
              </button>
            );
          })}
        </div>

        {carregando && <ListaEsqueleto />}
        {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

        <div className="flex flex-col gap-space-sm">
          {filtrados.map((c) => (
            <Link
              key={c.id}
              href={`/contatos/${c.id}`}
              className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface neu-pressable active:scale-[0.99] flex flex-col gap-1"
            >
              <div className="flex items-center justify-between gap-space-xs">
                <h2 className="font-title-md text-title-md text-on-surface truncate">{nomeDaOutraParte(c)}</h2>
                <span className="font-caption text-caption text-on-surface-variant flex-shrink-0">
                  {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface line-clamp-1">{c.mensagem}</p>
              <div className="flex items-center justify-between mt-space-xs pt-space-xs">
                <ContatoStatusBadge status={c.status} />
                {c.origem === "demanda" && (
                  <span className="font-caption text-caption text-on-surface-variant">via demanda</span>
                )}
              </div>
            </Link>
          ))}
          {!carregando && filtrados.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant text-center py-space-lg">
              Nenhum contato encontrado.
            </p>
          )}
        </div>

        {papel === "empresa" && (
          <Link
            href="/buscar"
            className="mt-space-sm w-full bg-gradient-to-br from-secondary-container via-surface-container to-surface-container-low rounded-2xl p-space-md neu-surface flex items-center justify-between gap-space-md"
          >
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0 neu-surface">
                <MaterialIcon name="person_search" className="text-[22px]" />
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface leading-snug">Precisa de outro especialista?</span>
                <span className="font-caption text-caption text-on-surface-variant">Encontre profissionais para o que você precisa</span>
              </div>
            </div>
            <MaterialIcon name="arrow_forward" className="text-[20px]" />
          </Link>
        )}
      </main>
    </>
  );
}
