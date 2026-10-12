import { Route, Routes } from "react-router-dom";
import CompanyShowcase from "../../modules/showcase/components/CompanyShowcase";

export default function AppRoutes({ t, locale }) {
  return (
    <Routes>
      {/*
        Public showcase. One reusable component serves every company by its id
        (the public link is /showcase/{companyId}).
        Examples:
          /showcase/fb47a31b-f412-442d-bad0-ce077eb0dffe
      */}
      <Route
        path="/showcase/:companySlug"
        element={<CompanyShowcase t={t} locale={locale} />}
      />

      {/* Anything else also shows the showcase (adjust if you add a landing). */}
      <Route
        path="*"
        element={<CompanyShowcase t={t} locale={locale} />}
      />
    </Routes>
  );
}