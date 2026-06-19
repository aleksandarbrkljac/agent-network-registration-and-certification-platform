import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { AgentProfilePage } from "./pages/AgentProfilePage.js";
import { CatalogPage } from "./pages/CatalogPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { MarketplacePage } from "./pages/MarketplacePage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { ReviewQueuePage } from "./pages/ReviewQueuePage.js";
import { SourcesPage } from "./pages/SourcesPage.js";

/**
 * Route table. Every page is wired to tRPC and reachable from the
 * nav shell, so all 10 demo criteria are demoable by clicking.
 */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="agents/:slug" element={<AgentProfilePage />} />
        <Route path="review" element={<ReviewQueuePage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>
    </Routes>
  );
}
