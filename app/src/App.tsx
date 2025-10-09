import { Navigate, Route, Routes } from "react-router-dom";
import { SolanaProviders } from "./providers/SolanaProviders";
import { PresaleProvider } from "./providers/PresaleProvider";
import { ApiProvider } from "./providers/ApiProvider";
import { PresalePage } from "./pages/PresalePage";
import { AdminPage } from "./pages/AdminPage";
import { TokenOperationsPage } from "./pages/TokenOperationsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { PageLayout } from "./layouts/PageLayout";

const App = () => {
  return (
    <SolanaProviders>
      <ApiProvider>
        <PresaleProvider>
          <PageLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/presale" replace />} />
              <Route path="/presale" element={<PresalePage />} />
              <Route path="/admin/presale" element={<AdminPage />} />
              <Route path="/admin/token" element={<TokenOperationsPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
            </Routes>
          </PageLayout>
        </PresaleProvider>
      </ApiProvider>
    </SolanaProviders>
  );
};

export default App;
