import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { DevToolsProvider } from "./devtools";
import "./index.css";

function RootWithDirection() {
  const { language } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";
  }, [language]);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DevToolsProvider>
      <LanguageProvider>
        <RootWithDirection />
      </LanguageProvider>
    </DevToolsProvider>
  </React.StrictMode>
);

