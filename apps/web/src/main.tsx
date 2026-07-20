import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { PricingPage } from "./components/PricingPage";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <PricingPage />
    </I18nextProvider>
  </StrictMode>
);
