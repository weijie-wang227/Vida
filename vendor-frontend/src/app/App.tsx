import { BrowserRouter } from "react-router";
import { VendorStateProvider } from "../state";
import { AuthGate } from "./AuthGate";

export default function App() {
  return (
    <BrowserRouter>
      <VendorStateProvider>
        <AuthGate />
      </VendorStateProvider>
    </BrowserRouter>
  );
}
