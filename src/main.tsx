import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { DeveloperConsoleProvider } from "./config/DeveloperConsoleContext";
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
    <DeveloperConsoleProvider>
      <LanguageProvider>
        <RootWithDirection />
      </LanguageProvider>
    </DeveloperConsoleProvider>
  </React.StrictMode>
);

