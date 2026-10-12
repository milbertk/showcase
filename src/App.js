import "./App.css";
import "./App/shared/i18n/i18n";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { BrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AppRoutes from "./App/shared/routing/routing";

export const AppContext = createContext(null);

const LANGUAGE_STORAGE_KEY = "serviceHub.showcase.language";
const SUPPORTED_LANGUAGES = ["en", "es"];

const resolveInitialLanguage = () => {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (SUPPORTED_LANGUAGES.includes(storedLanguage)) {
    return storedLanguage;
  }

  const browserLanguage = navigator.language?.split("-")[0] || "en";

  return SUPPORTED_LANGUAGES.includes(browserLanguage)
    ? browserLanguage
    : "en";
};

function App() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(resolveInitialLanguage);

  useEffect(() => {
    const currentLanguage = i18n.resolvedLanguage?.split("-")[0];

    if (currentLanguage !== language) {
      i18n.changeLanguage(language);
    }
  }, [i18n, language]);

  const changeLanguage = useCallback(
    async (nextLanguage) => {
      if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) {
        return;
      }

      await i18n.changeLanguage(nextLanguage);

      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      setLanguage(nextLanguage);

      toast.info(i18n.t("showcaseApp.messages.languageChanged"));
    },
    [i18n],
  );

  const showToast = useCallback((type, message, options = {}) => {
    const toastMethods = {
      success: toast.success,
      error: toast.error,
      warning: toast.warn,
      info: toast.info,
    };

    const method = toastMethods[type] || toast.info;
    method(message, options);
  }, []);

  const contextValue = useMemo(
    () => ({
      t,
      i18n,
      language,
      supportedLanguages: SUPPORTED_LANGUAGES,
      changeLanguage,
      showToast,
    }),
    [t, i18n, language, changeLanguage, showToast],
  );

  const locale = language === "es" ? "es-CR" : "en-US";

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <AppRoutes t={t} locale={locale} />
      </BrowserRouter>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        pauseOnHover
        draggable
        theme="light"
      />
    </AppContext.Provider>
  );
}

export default App;