import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import "@fontsource-variable/geist";
import i18n from "./i18n";
import { App } from "./App";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import "./index.css";
import "./legacy.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </I18nextProvider>
  </StrictMode>
);
