import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Só funções puras (lib/), sem DOM. Textos de tela são conferidos no navegador.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
});
