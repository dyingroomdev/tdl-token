import { TokenOperationsPanel } from "../components/token/TokenOperationsPanel";
import { StatusCard } from "../components/presale/StatusCard";
import { ApiKeyBanner } from "../components/admin/ApiKeyBanner";

export const TokenOperationsPage = () => {
  return (
    <div className="space-y-8">
      <ApiKeyBanner />
      <StatusCard />
      <TokenOperationsPanel />
    </div>
  );
}
