import { Route, Routes } from "react-router-dom";
import CompanyShowcase from "../../modules/showcase/components/CompanyShowcase";
import ManageRequest from "../../modules/showcase/components/ManageRequest";

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

      {/* Customer "manage my request" page, opened from the email link:
          /showcase/{companyId}/r/{token} */}
      <Route
        path="/showcase/:companySlug/r/:token"
        element={<ManageRequest t={t} locale={locale} />}
      />

      {/* Anything else also shows the showcase (adjust if you add a landing). */}
      <Route
        path="*"
        element={<CompanyShowcase t={t} locale={locale} />}
      />
    </Routes>
  );
}