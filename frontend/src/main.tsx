import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { applyThemeMode, getStoredThemeMode } from "./app/themeMode";
import "./styles/index.css";

applyThemeMode(getStoredThemeMode());

createRoot(document.getElementById("root")!).render(<App />);
