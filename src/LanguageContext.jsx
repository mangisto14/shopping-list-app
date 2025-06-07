import { createContext, useContext, useEffect, useState } from "react";

// יצירת הקשר
const LanguageContext = createContext();

// פונקציית זיהוי שפה ראשונית מהדפדפן
const getDefaultLang = () => {
  const lang = navigator.language || navigator.userLanguage;
  return lang.startsWith("he") ? "he" : "en";
};

// ספק הקשר - עוטף את כל האפליקציה
export function LanguageProvider({ children }) {
  // קריאת שפה מה-localStorage או דפדפן
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || getDefaultLang();
  });

  // שמירת שפה ועדכון כיוון דף
  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";
  }, [language]);

  // טקסטים לכל שפה
  const labels = {
    he: {
      dir: "rtl",
      title: "🛒 רשימת קניות",
      placeholder: "הוסף פריט...",
      add: "הוסף",
      delete: "מחק",
      login: "התחברות",
      email: "דוא״ל",
      password: "סיסמה",
      submit: "התחבר",
      lang: "עברית",
    },
    en: {
      dir: "ltr",
      title: "🛒 Shopping List",
      placeholder: "Add item...",
      add: "Add",
      delete: "Delete",
      login: "Login",
      email: "Email",
      password: "Password",
      submit: "Log in",
      lang: "English",
    },
  };

  // משתנה t מייצג את כל התרגומים לשפה הנוכחית
  const t = labels[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// וו פשוט לשימוש בקומפוננטים
export function useLanguage() {
  return useContext(LanguageContext);
}
