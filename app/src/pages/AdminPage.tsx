import { AdminPanel } from "../components/presale/AdminPanel";
import { StatusCard } from "../components/presale/StatusCard";

export const AdminPage = () => {
  return (
    <div className="space-y-8">
      <StatusCard />
      <AdminPanel />
    </div>
  );
};
