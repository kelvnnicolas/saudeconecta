"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "./MaterialIcon";

const STORAGE_KEY = "saudeconecta:theme";

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: "light" | "dark" | null) {
  const root = document.documentElement;
  if (theme) root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
}

export function ThemeToggle() {
  // Evita mismatch de hidratação: só reflete o tema real depois de montar no cliente.
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage indisponível (modo privado etc.) — segue no padrão do sistema
    }
    const theme = stored === "light" || stored === "dark" ? stored : null;
    applyTheme(theme);
    setIsDark(theme ? theme === "dark" : systemPrefersDark());
    setMounted(true);
  }, []);

  function toggle() {
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    setIsDark(next === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ok manter só em memória nesta sessão
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={mounted && isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary neu-surface-sm neu-pressable transition-colors"
    >
      <MaterialIcon name={mounted && isDark ? "light_mode" : "dark_mode"} />
    </button>
  );
}
