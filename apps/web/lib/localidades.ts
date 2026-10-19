export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const cache = new Map<string, string[]>();

// API pública do IBGE — evita manter ~5.570 municípios no bundle.
export async function buscarMunicipios(uf: string): Promise<string[]> {
  const guardado = cache.get(uf);
  if (guardado) return guardado;
  const resposta = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
  );
  if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`);
  const dados = (await resposta.json()) as { nome: string }[];
  const nomes = dados.map((m) => m.nome);
  cache.set(uf, nomes);
  return nomes;
}
