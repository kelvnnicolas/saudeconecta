"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/ui/BottomNav";
import { Logo } from "@/components/ui/Logo";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { ListaEsqueleto } from "@/components/ui/Skeleton";
import { FormularioConferencia } from "@/components/admin/FormularioConferencia";
import { api, ApiError } from "@/lib/api";
import type { StatusVerificacao, TrilhaVerificacaoItem, VerificacaoAdminItem } from "@/lib/types";

const FILTROS: { valor: StatusVerificacao; rotulo: string }[] = [
  { valor: "pending", rotulo: "Pendentes" },
  { valor: "unable_to_verify", rotulo: "Não conferidos" },
  { valor: "irregular", rotulo: "Irregulares" },
  { valor: "verified", rotulo: "Conferidos" },
];

const ROTULO_STATUS: Record<StatusVerificacao, string> = {
  unverified: "Não conferido",
  pending: "Pendente",
  verified: "Conferido",
  irregular: "Irregular",
  unable_to_verify: "Não foi possível conferir",
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminVerificacoesPage() {
  const [acesso, setAcesso] = useState<"verificando" | "permitido" | "negado" | "falha">("verificando");
  const [filtro, setFiltro] = useState<StatusVerificacao>("pending");
  const [itens, setItens] = useState<VerificacaoAdminItem[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [trilha, setTrilha] = useState<Record<string, TrilhaVerificacaoItem[] | "erro">>({});

  useEffect(() => {
    api
      .adminEu()
      .then(() => setAcesso("permitido"))
      .catch((e) => setAcesso(e instanceof ApiError && e.status === 403 ? "negado" : "falha"));
  }, []);

  const carregar = useCallback(
    (offset = 0) => {
      setCarregando(true);
      api
        .adminListarVerificacoes(filtro, offset)
        .then((r) => {
          setItens((atual) => (offset === 0 ? r.items : [...atual, ...r.items]));
          setTotal(r.total);
          setErro(null);
        })
        .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar a fila."))
        .finally(() => setCarregando(false));
    },
    [filtro],
  );

  useEffect(() => {
    if (acesso === "permitido") {
      setAberto(null);
      carregar(0);
    }
  }, [acesso, carregar]);

  function verHistorico(id: string) {
    if (trilha[id]) return;
    api
      .adminHistoricoVerificacao(id)
      .then((t) => setTrilha((atual) => ({ ...atual, [id]: t })))
      .catch(() => setTrilha((atual) => ({ ...atual, [id]: "erro" })));
  }

  if (acesso === "verificando") {
    return (
      <main className="flex-1 pt-space-md px-gutter pb-24 bg-surface min-h-screen">
        <ListaEsqueleto quantidade={3} aviso={false} />
      </main>
    );
  }

  if (acesso !== "permitido") {
    return (
      <>
        <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
          <Logo compact />
          <p className="font-body-md text-body-md text-on-surface-variant">
            {acesso === "negado"
              ? "Esta área é restrita a administradores."
              : "Não foi possível verificar seu acesso agora. Tente de novo em instantes."}
          </p>
          <Link href="/buscar" className="self-start font-label-sm text-label-sm text-primary">
            Voltar para a busca
          </Link>
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <div>
          <div className="flex items-center gap-1.5">
            <Logo compact />
            <h1 className="font-headline-md text-headline-md text-on-surface">Conferência de registros</h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Confira o registro informado numa fonte oficial e registre o resultado. O selo público só aparece para &quot;Registro conferido&quot;.
          </p>
        </div>

        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-space-xs">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              aria-pressed={filtro === f.valor}
              className={`h-11 px-space-sm rounded-full bg-surface-container-lowest neu-surface font-label-sm text-label-sm text-on-surface ${
                filtro === f.valor ? "ring-2 ring-primary" : ""
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        {erro && <p role="alert" className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

        <div className="flex flex-col gap-space-sm">
          {itens.map((item) => {
            const expandido = aberto === item.user_id;
            const t = trilha[item.user_id];
            return (
              <section key={item.user_id} className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-xs">
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="min-w-0">
                    <h2 className="font-title-md text-title-md text-on-surface truncate">{item.nome}</h2>
                    <p className="font-caption text-caption text-on-surface-variant">
                      {[item.cidade, item.estado].filter(Boolean).join(", ") || "Local não informado"} · {ROTULO_STATUS[item.status]} em {formatarData(item.atualizado_em)}
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Registro informado: {item.registro_informado ?? "nenhum"}
                    </p>
                  </div>
                  <Link href={`/profissional/${item.user_id}`} className="font-label-sm text-label-sm text-primary shrink-0 min-h-[44px] flex items-center">
                    Ver perfil
                  </Link>
                </div>
                <div className="flex gap-space-sm">
                  <button
                    type="button"
                    aria-expanded={expandido}
                    onClick={() => setAberto(expandido ? null : item.user_id)}
                    className="h-11 px-space-sm rounded-full bg-primary text-on-primary font-label-sm text-label-sm"
                  >
                    {expandido ? "Fechar" : "Registrar resultado"}
                  </button>
                  <button
                    type="button"
                    onClick={() => verHistorico(item.user_id)}
                    className="h-11 px-space-sm rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface"
                  >
                    Histórico
                  </button>
                </div>
                {t === "erro" && <p className="font-caption text-caption text-error">Não foi possível carregar o histórico.</p>}
                {Array.isArray(t) && (
                  <ul className="flex flex-col gap-1 font-caption text-caption text-on-surface-variant">
                    {t.map((l) => (
                      <li key={l.id}>
                        {formatarData(l.criado_em)} · {ROTULO_STATUS[l.status_anterior]} → {ROTULO_STATUS[l.status_novo]} ({l.ator_tipo})
                        {l.fonte ? ` · ${l.fonte}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {expandido && (
                  <FormularioConferencia
                    item={item}
                    aoConcluir={() => {
                      setAberto(null);
                      setTrilha((atual) => {
                        const { [item.user_id]: _removido, ...resto } = atual;
                        return resto;
                      });
                      carregar(0);
                    }}
                  />
                )}
              </section>
            );
          })}
          {carregando && <ListaEsqueleto quantidade={2} aviso={false} />}
          {!carregando && itens.length === 0 && !erro && (
            <p className="font-body-md text-body-md text-on-surface-variant text-center py-space-lg flex items-center justify-center gap-1">
              <MaterialIcon name="task_alt" className="text-[20px]" />
              Nada nesta fila.
            </p>
          )}
          {!carregando && itens.length < total && (
            <button type="button" onClick={() => carregar(itens.length)} className="self-center h-11 px-space-md rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface">
              Carregar mais
            </button>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
