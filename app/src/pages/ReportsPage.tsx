import { ReportsPanel } from "../components/reports/ReportsPanel";
import { ApiKeyBanner } from "../components/admin/ApiKeyBanner";

export const ReportsPage = () => {
  return (
    <div className="space-y-8">
      <ApiKeyBanner />
      <ReportsPanel />
    </div>
  );
};
