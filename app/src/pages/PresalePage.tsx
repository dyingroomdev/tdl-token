import { StatusCard } from "../components/presale/StatusCard";
import { BuyPanel } from "../components/presale/BuyPanel";
import { ClaimPanel } from "../components/presale/ClaimPanel";

export const PresalePage = () => {
  return (
    <div className="space-y-8">
      <StatusCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <BuyPanel />
        <ClaimPanel />
      </div>
    </div>
  );
};
