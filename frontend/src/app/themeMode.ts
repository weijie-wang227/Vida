export type vidaThemeMode = "light" | "dark";

const themeModeStorageKey = "vida-theme-mode";

function isThemeMode(value: string | null): value is vidaThemeMode {
  return value === "light" || value === "dark";
}

export function getStoredThemeMode(): vidaThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedMode = window.localStorage.getItem(themeModeStorageKey);

  return isThemeMode(storedMode) ? storedMode : "dark";
}

export function applyThemeMode(mode: vidaThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  root.classList.toggle("vida-theme-light", mode === "light");
  root.classList.toggle("vida-theme-dark", mode === "dark");
  root.style.colorScheme = mode;
}

export function persistThemeMode(mode: vidaThemeMode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(themeModeStorageKey, mode);
  }

  applyThemeMode(mode);
}
