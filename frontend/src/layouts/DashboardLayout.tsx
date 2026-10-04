import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import AlertFeed from "@/components/layout/AlertFeed";
import InvestigationBar from "@/components/layout/InvestigationBar";
import { useAlertsStore, useUIStore } from "@/store";
import { useHydrateModuleResults } from "@/hooks/useHydrateModuleResults";
import { Bell } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  useHydrateModuleResults();

  const { alertFeedOpen, toggleAlertFeed } = useUIStore();
  const alerts = useAlertsStore((s) => s.alerts);

  const activeCount = alerts.filter((a) => !a.is_dismissed).length;

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      style={{ background: "var(--soc-bg)" }}
    >
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <InvestigationBar />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>

      {alertFeedOpen ? (
        <AlertFeed />
      ) : (
        <button
          onClick={toggleAlertFeed}
          className="fixed right-4 bottom-4 px-3 py-2 rounded-full flex items-center gap-2 shadow-lg"
          style={{
            background: "var(--soc-accent)",
            color: "white",
            border: "1px solid var(--soc-border)",
            zIndex: 50,
          }}
          title="Open alert feed"
        >
          <Bell size={16} />
          <span className="text-xs font-semibold">{activeCount}</span>
        </button>
      )}
    </div>
  );
}