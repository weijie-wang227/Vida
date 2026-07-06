import { BrowserRouter } from "react-router";
import { AppStateProvider } from "../state";
import { AuthGate } from "./AuthGate";

export default function App() {
  return (
    <BrowserRouter>
      <AppStateProvider>
        <AuthGate />
      </AppStateProvider>
    </BrowserRouter>
  );
}
