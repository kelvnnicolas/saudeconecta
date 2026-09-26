"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/ui/BottomNav";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { ContatoStatusBadge } from "@/components/ui/StatusBadge";
import { useCurrentUser } from "@/lib/use-current-user";
import { api } from "@/lib/api";
import type { ContatoRead, StatusContato } from "@/lib/types";

const FILTROS: { value: "todos" | StatusContato; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Aguardando resposta" },
  { value: "respondido", label: "Em andamento" },
  { value: "encerrado", label: "Concluídos" },
];

export default function MeusContatosPage() {
  const { papel } = useCurrentUser();
  const [contatos, setContatos] = useState<ContatoRead[]>([]);
  // ContatoRead só devolve solicitante_id/profissional_id (UUID) — sem
  // endpoint em lote, resolve nome por perfil único conforme a lista chega.
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["value"]>("todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let ativo = true;
    api
      .listContatos()
      .then(async (lista) => {
        if (!ativo) return;
        setContatos(lista);
        // Eu sou profissional -> a outra parte é sempre a empresa (solicitante_id).
        // Eu sou empresa -> a outra parte é sempre o profissional (profissional_id).
        const outroIdDe = (c: ContatoRead) => (papel === "profissional" ? c.solicitante_id : c.profissional_id);
        const idsUnicos = Array.from(new Set(lista.map(outroIdDe)));
        const buscarNome = papel === "profissional" ? api.getEmpresa : api.getProfissional;
        const entradas = await Promise.all(
          idsUnicos.map(async (id) => {
            try {
              const perfil = await buscarNome(id);
              return [id, perfil.nome] as const;
            } catch {
              return [id, papel === "profissional" ? "Empresa" : "Profissional"] as const;
            }
          }),
        );
        if (ativo) setNomes(Object.fromEntries(entradas));
      })
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : "Não foi possível carregar."))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [papel]);

  function nomeDaOutraParte(c: ContatoRead) {
    const id = papel === "profissional" ? c.solicitante_id : c.profissional_id;
    return nomes[id] ?? "...";
  }

  const filtrados = useMemo(() => {
    return contatos.filter((c) => {
      const nome = nomeDaOutraParte(c).toLowerCase();
      const bateFiltro = filtro === "todos" || c.status === filtro;
      const bateBusca = !busca || nome.includes(busca.toLowerCase()) || c.mensagem.toLowerCase().includes(busca.toLowerCase());
      return bateFiltro && bateBusca;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [contatos, filtro, busca, nomes, papel]);

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <div>
          <div className="flex items-center gap-1.5">
            <Logo compact />
            <h1 className="font-headline-md text-headline-md text-on-surface">Meus Contatos</h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Gerencie conversas, propostas e atendimentos em andamento
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
                className={`flex-shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-label-sm transition-all ${
                  ativo ? "bg-primary text-on-primary neu-surface" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {f.label} <span className="ml-1 opacity-80 font-normal">({count})</span>
              </button>
            );
          })}
        </div>

        {carregando && (
          <div className="flex justify-center py-space-lg">
            <MaterialIcon name="progress_activity" className="text-[28px] text-primary animate-spin" />
          </div>
        )}
        {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

        <div className="flex flex-col gap-space-sm">
          {filtrados.map((c) => (
            <Link
              key={c.id}
              href={`/contatos/${c.id}`}
              className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface neu-pressable transition-all active:scale-[0.99] flex flex-col gap-1"
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

        <Link
          href="/buscar"
          className="mt-space-sm w-full bg-gradient-to-br from-primary-fixed via-surface-container to-surface-container-low rounded-2xl p-space-md neu-surface flex items-center justify-between gap-space-md"
        >
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0 neu-surface">
              <MaterialIcon name="person_search" className="text-[22px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-title-md text-title-md text-on-surface leading-snug">Precisa de outro especialista?</span>
              <span className="font-caption text-caption text-on-surface-variant">Centenas de profissionais verificados hoje</span>
            </div>
          </div>
          <MaterialIcon name="arrow_forward" className="text-[20px]" />
        </Link>
      </main>
      <BottomNav />
    </>
  );
}
