import { describe, expect, it } from "vitest";
import { completudeDoPerfil } from "./completude-perfil";

const registroDe = (...args: Parameters<typeof completudeDoPerfil>) =>
  completudeDoPerfil(...args).itens.find((i) => i.id === "registro");

const completo = {
  avatar_url: "https://x/y.png",
  bio: "Enfermeira com 10 anos de UTI.",
  especialidades: [{ id: 1, nome: "Enfermagem" }],
  preco_hora: 80,
  registro_profissional: "COREN-SP 123456",
};

describe("completude do perfil", () => {
  it("perfil completo e conferido: 5 de 5", () => {
    const r = completudeDoPerfil(completo, "verified");
    expect(r.feitos).toBe(5);
    expect(r.itens.every((i) => i.ok && !i.detalhe)).toBe(true);
  });

  it("registro informado mas não conferido não conta como conferido", () => {
    const r = completudeDoPerfil(completo, "unverified");
    const registro = r.itens.find((i) => i.id === "registro")!;
    expect(registro.ok).toBe(false);
    expect(registro.detalhe).toBe("Peça a conferência");
    expect(r.feitos).toBe(4);
  });

  it("descreve cada estado da conferência sem prometer o que não existe", () => {
    expect(registroDe(completo, "pending")?.detalhe).toBe("Conferência em andamento");
    expect(registroDe(completo, "irregular")?.detalhe).toBe("Há uma pendência no registro");
    expect(registroDe(completo, "unable_to_verify")?.detalhe).toBe("Não foi possível conferir");
    expect(registroDe({ ...completo, registro_profissional: null }, "unverified")?.detalhe).toBe(
      "Registro não informado",
    );
  });

  it("perfil vazio: só tem link onde existe tela para resolver", () => {
    const r = completudeDoPerfil(
      { avatar_url: null, bio: "  ", especialidades: [], preco_hora: null, registro_profissional: null },
      null,
    );
    expect(r.feitos).toBe(0);
    expect(r.itens.filter((i) => i.href).map((i) => i.id)).toEqual(["foto", "registro"]);
  });
});
