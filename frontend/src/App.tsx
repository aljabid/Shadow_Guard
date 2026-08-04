import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/layouts/ProtectedRoute";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ReportsPage from "@/pages/ReportsPage";
import EntitiesPage from "@/pages/EntitiesPage";
import InvestigationPage from "@/pages/InvestigationPage";
import InvestigationsPage from "@/pages/InvestigationsPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import DarkNetFeedPage from "@/pages/DarkNetFeedPage";
import WalletTrackerPage from "@/pages/WalletTrackerPage";
import LeakMonitorPage from "@/pages/LeakMonitorPage";
import { useUIStore } from "@/store";

export default function App() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ReportsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/entities"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <EntitiesPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/investigation/:moduleId/:findingIndex"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <InvestigationPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/investigations"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <InvestigationsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <HistoryPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredRole={["admin"]}>
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/darknet-feed"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DarkNetFeedPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/wallet-tracker"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WalletTrackerPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/leak-monitor"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <LeakMonitorPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}