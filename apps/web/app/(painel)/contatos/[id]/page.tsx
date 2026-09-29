"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Header } from "@/components/ui/Header";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useCurrentUser } from "@/lib/use-current-user";
import { type AvaliacaoInput, avaliacaoSchema } from "@/lib/validations/contato";
import { api } from "@/lib/api";
import type { ContatoRead, MensagemContatoRead } from "@/lib/types";

export default function DetalheContatoPage({ params }: { params: { id: string } }) {
  const { papel, session } = useCurrentUser();
  const [contato, setContato] = useState<ContatoRead | null>(null);
  const [nomeOutraParte, setNomeOutraParte] = useState("...");
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemContatoRead[]>([]);
  const [corpoMensagem, setCorpoMensagem] = useState("");
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [aceitando, setAceitando] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AvaliacaoInput>({ resolver: zodResolver(avaliacaoSchema), defaultValues: { nota: 0 } });
  const nota = watch("nota");

  useEffect(() => {
    // GET /contatos não tem endpoint de detalhe único — traz a lista toda
    // (só as partes envolvidas veem) e filtra pelo id da rota.
    api
      .listContatos()
      .then(async (lista) => {
        const encontrado = lista.find((c) => String(c.id) === params.id) ?? null;
        setContato(encontrado);
        if (!encontrado) return;
        const outroId = papel === "profissional" ? encontrado.solicitante_id : encontrado.profissional_id;
        const buscar = papel === "profissional" ? api.getEmpresa : api.getProfissional;
        try {
          const perfil = await buscar(outroId);
          setNomeOutraParte(perfil.nome);
        } catch {
          setNomeOutraParte(papel === "profissional" ? "Empresa" : "Profissional");
        }
      })
      .catch((e) => setErroCarregar(e instanceof Error ? e.message : "Não foi possível carregar o contato."))
      .finally(() => setCarregando(false));
  }, [params.id, papel]);

  useEffect(() => {
    if (!contato) return;
    let cancelado = false;
    async function buscarMensagens() {
      try {
        const lista = await api.listarMensagensContato(contato!.id);
        if (!cancelado) setMensagens(lista);
      } catch {
        // poll silencioso — próxima tentativa em 7s
      }
    }
    buscarMensagens();
    const intervalo = setInterval(buscarMensagens, 7000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [contato?.id]);

  async function onSubmit(data: AvaliacaoInput) {
    if (!contato) return;
    setErro(null);
    try {
      const alvoId = papel === "profissional" ? contato.solicitante_id : contato.profissional_id;
      await api.createAvaliacao({ alvo_id: alvoId, nota: data.nota, comentario: data.comentario });
      setAvaliacaoEnviada(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar a avaliação.");
    }
  }

  async function enviarMensagem() {
    if (!contato || !corpoMensagem.trim()) return;
    setEnviandoMensagem(true);
    try {
      const nova = await api.enviarMensagemContato(contato.id, corpoMensagem.trim());
      setMensagens((atual) => [...atual, nova]);
      setCorpoMensagem("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar a mensagem.");
    } finally {
      setEnviandoMensagem(false);
    }
  }

  async function aceitarDemanda() {
    if (!contato) return;
    setAceitando(true);
    try {
      const atualizado = await api.aceitarDemandaDireta(contato.id);
      setContato(atualizado);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível aceitar a demanda.");
    } finally {
      setAceitando(false);
    }
  }

  if (carregando) {
    return (
      <>
        <Header title="Detalhes do Contato" backHref="/contatos" />
        <main className="flex-1 pt-16 flex items-center justify-center bg-surface min-h-screen">
          <MaterialIcon name="progress_activity" className="text-[32px] text-primary animate-spin" />
        </main>
      </>
    );
  }

  if (erroCarregar || !contato) {
    return (
      <>
        <Header title="Detalhes do Contato" backHref="/contatos" />
        <main className="flex-1 pt-16 px-gutter bg-surface min-h-screen flex flex-col items-center justify-center gap-space-sm text-center">
          <MaterialIcon name="error" className="text-[32px] text-error" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            {erroCarregar ?? "Contato não encontrado."}
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Detalhes do Contato" backHref="/contatos" />
      <main className="flex-1 pt-16 pb-space-xl px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-xs mt-space-sm">
          <h1 className="font-title-md text-title-md text-on-surface">{nomeOutraParte}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{contato.mensagem}</p>
          <span className="font-caption text-caption text-outline">
            {new Date(contato.criado_em).toLocaleString("pt-BR")}
          </span>
        </section>

        <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-sm">
          <h2 className="font-title-md text-title-md text-on-surface">Conversa</h2>
          <div className="flex flex-col gap-space-xs max-h-80 overflow-y-auto">
            {mensagens.length === 0 && (
              <p className="font-caption text-caption text-on-surface-variant text-center py-space-sm">
                Nenhuma mensagem ainda. Comece a conversa.
              </p>
            )}
            {mensagens.map((msg) => {
              const minha = msg.autor_id === session?.user.id;
              return (
                <div key={msg.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-xl px-space-sm py-space-xs ${
                      minha ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface"
                    }`}
                  >
                    <p className="font-body-md text-body-md">{msg.corpo}</p>
                    <span
                      className={`font-caption text-caption ${minha ? "text-on-primary/70" : "text-outline"}`}
                    >
                      {new Date(msg.criado_em).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-space-xs">
            <input
              type="text"
              value={corpoMensagem}
              onChange={(e) => setCorpoMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviarMensagem();
              }}
              placeholder="Escreva uma mensagem..."
              className="flex-1 h-11 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={enviarMensagem}
              disabled={enviandoMensagem || !corpoMensagem.trim()}
              aria-label="Enviar mensagem"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-primary text-on-primary neu-surface neu-pressable disabled:opacity-60"
            >
              <MaterialIcon name="send" className="text-[20px]" />
            </button>
          </div>
        </section>

        {contato.aceito_em ? (
          <section className="rounded-2xl p-space-md bg-secondary-container/40 border border-secondary-container flex items-center gap-space-xs">
            <MaterialIcon name="check_circle" filled className="text-[18px] text-on-secondary-container" />
            <p className="font-caption text-caption text-on-secondary-container">
              Demanda direta aceita em {new Date(contato.aceito_em).toLocaleString("pt-BR")}
            </p>
          </section>
        ) : (
          papel === "profissional" && (
            <button
              type="button"
              onClick={aceitarDemanda}
              disabled={aceitando}
              className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs disabled:opacity-60"
            >
              <MaterialIcon name="handshake" className="text-[20px]" />
              {aceitando ? "Aceitando..." : "Aceitar demanda direta"}
            </button>
          )
        )}

        {avaliacaoEnviada ? (
          <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col items-center gap-space-sm text-center">
            <MaterialIcon name="check_circle" filled className="text-[40px] text-secondary" />
            <p className="font-title-md text-title-md text-on-surface">Avaliação enviada!</p>
            <p className="font-body-md text-body-md text-on-surface-variant">Obrigado pelo retorno.</p>
          </section>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface">Como foi sua experiência com {nomeOutraParte.split(" ")[0]}?</h2>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => i + 1).map((valor) => (
                <button
                  type="button"
                  key={valor}
                  onClick={() => setValue("nota", valor, { shouldValidate: true })}
                  aria-label={`${valor} estrela(s)`}
                >
                  <MaterialIcon
                    name="star"
                    filled={valor <= nota}
                    className={`text-[28px] ${valor <= nota ? "text-tertiary" : "text-outline-variant"}`}
                  />
                </button>
              ))}
            </div>
            {errors.nota && <span className="font-caption text-caption text-error">Selecione uma nota</span>}
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Comentário (opcional)</span>
              <textarea
                {...register("comentario")}
                rows={3}
                placeholder="Conte como foi o atendimento..."
                className="px-space-md py-space-sm rounded-xl bg-surface-container-lowest neu-inset-sm resize-none"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting || nota === 0}
              className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
            >
              Enviar avaliação
            </button>
            {erro && <p className="font-caption text-caption text-error">{erro}</p>}
          </form>
        )}
      </main>
    </>
  );
}
