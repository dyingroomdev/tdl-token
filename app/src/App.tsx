import { Navigate, Route, Routes } from "react-router-dom";
import { SolanaProviders } from "./providers/SolanaProviders";
import { PresaleProvider } from "./providers/PresaleProvider";
import { PresalePage } from "./pages/PresalePage";
import { AdminPage } from "./pages/AdminPage";
import { PageLayout } from "./layouts/PageLayout";

const App = () => {
  return (
    <SolanaProviders>
      <PresaleProvider>
        <PageLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/presale" replace />} />
            <Route path="/presale" element={<PresalePage />} />
            <Route path="/presale/admin" element={<AdminPage />} />
          </Routes>
        </PageLayout>
      </PresaleProvider>
    </SolanaProviders>
  );
};

export default App;
