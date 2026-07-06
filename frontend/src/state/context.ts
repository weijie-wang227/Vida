import { createContext, useContext } from "react";
import type { AppState } from "./types";

export const AppStateContext = createContext<AppState | null>(null);

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }

  return context;
}
