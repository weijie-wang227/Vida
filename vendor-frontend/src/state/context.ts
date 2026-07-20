import { createContext, useContext } from "react";
import type { VendorState } from "./types";

export const VendorStateContext = createContext<VendorState | null>(null);

export function useVendorState() {
  const context = useContext(VendorStateContext);

  if (!context) {
    throw new Error("useVendorState must be used inside VendorStateProvider.");
  }

  return context;
}
