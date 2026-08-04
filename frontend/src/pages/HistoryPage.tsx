import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { modulesApi } from "@/api/modules.api";
import { investigationsApi } from "@/api/investigations.api";
import { useModulesStore } from "@/store";
import {
  History, RefreshCcw, CheckCircle, Clock,
  XCircle, Loader, Shield, Search, TrendingUp, Dice6, Network,
  PackageSearch, Play, FolderPlus, FileText,
} from "lucide-react";

const MODULE_ACCENT: Record<string, string> = {
  kolkhoz: "#ef4444", droper: "#f97316", piramida: "#eab308",
  shadowbet: "#a855f7", tengraf: "#3b82f6", contraband: "#10b981",
};
const MODULE_LABEL: Record<string, string> = {
  kolkhoz: "KOLKHOZ", droper: "DROPER", piramida: "PIRAMIDA",
  shadowbet: "SHADOWBET", tengraf: "TENGRAF", contraband: "CONTRABAND",
};
const MODULE_ICONS: Record<string, React.ElementType> = {
  kolkhoz: Shield, droper: Search, piramida: TrendingUp,
  shadowbet: Dice6, tengraf: Network, contraband: PackageSearch,
};

interface ScanTask {
  task_id: string;
  module_id: string;
  status: string;
  mode: string;
  created_at: string;
  completed_at?: string;
  has_result: boolean;
  error?: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    success: { icon: CheckCircle, color: "#22c55e", label: "Success" },
    failure: { icon: XCircle, color: "#ef4444", label: "Failed" },
    queued: { icon: Clock, color: "#f59e0b", label: "Queued" },
    started: { icon: Loader, color: "#60a5fa", label: "Running" },
  };
  const s = map[status] || { icon: Clock, color: "#6b7280", label: status };
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={11} style={{ color: s.color }} />
      <span className="text-xs" style={{ color: s.color }}>{s.label}</span>
    </div>
  );
}

function duration(created: string, completed?: string): string {
  if (!completed) return "—";
  const ms = new Date(completed).getTime() - new Date(created).getTime();
  if (ms < 1000) return "<1s";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { setActiveModule } = useModulesStore();
  const [tasks, setTasks] = useState<ScanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [creating, setCreating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = moduleFilter !== "all" ? moduleFilter : undefined;
      const data = await modulesApi.getHistory(mod, 100);
      setTasks(data.tasks || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [moduleFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (modeFilter !== "all" && t.mode !== modeFilter) return false;
    return true;
  });

  const handleViewResult = (task: ScanTask) => {
    // We'd need to fetch the result — navigate to module panel for now
    setActiveModule(task.module_id);
    navigate("/dashboard");
  };

  const handleCreateInvestigation = async (task: ScanTask) => {
    setCreating(task.task_id);
    try {
      const inv = await investigationsApi.create({
        title: `${MODULE_LABEL[task.module_id] || task.module_id} Scan — ${new Date(task.created_at).toLocaleDateString()}`,
        description: `Investigation from ${task.mode === "demo" ? "Demo" : "Live"} scan on ${new Date(task.created_at).toLocaleString()}`,
        module_ids: [task.module_id],
        risk_level: "high",
        linked_task_ids: [task.task_id],
      });
      setSuccessMsg(`Investigation created: ${inv.title || "New Investigation"}`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } finally {
      setCreating(null);
    }
  };

  const succCount = tasks.filter(t => t.status === "success").length;
  const demoCount = tasks.filter(t => t.mode === "demo").length;
  const liveCount = tasks.filter(t => t.mode === "live").length;

  return (
    <div>
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2"
          style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e" }}>
          <CheckCircle size={14} />
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold tracking-wide" style={{ color: "#e5e7eb" }}>Scan History</h1>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
            All past scans — re-open results, create investigations, generate reports
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
          style={{ background: "var(--soc-surface-2)", border: "1px solid #1a2640", color: "#9ca3af" }}>
          <RefreshCcw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Scans", value: tasks.length, color: "#60a5fa" },
          { label: "Successful", value: succCount, color: "#22c55e" },
          { label: "Demo Scans", value: demoCount, color: "#f97316" },
          { label: "Live Scans", value: liveCount, color: "#3b82f6" },
        ].map(item => (
          <div key={item.label} className="card">
            <p className="text-xs" style={{ color: "#6b7280" }}>{item.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Module filter */}
        <div className="flex gap-1">
          {["all", ...Object.keys(MODULE_LABEL)].map(m => {
            const color = MODULE_ACCENT[m] || "#6b7280";
            const Icon = MODULE_ICONS[m];
            return (
              <button key={m} onClick={() => setModuleFilter(m)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium"
                style={{
                  background: moduleFilter === m ? (m === "all" ? "#374151" : `${color}20`) : "transparent",
                  border: `1px solid ${moduleFilter === m ? (m === "all" ? "#4b5563" : color) : "#1a2640"}`,
                  color: moduleFilter === m ? (m === "all" ? "#e5e7eb" : color) : "#6b7280",
                }}>
                {Icon && <Icon size={10} />}
                {m === "all" ? "All Modules" : MODULE_LABEL[m]}
              </button>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          {[["all", "All Status"], ["success", "Success"], ["failure", "Failed"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className="px-2.5 py-1.5 rounded text-xs"
              style={{
                background: statusFilter === v ? "#374151" : "transparent",
                border: `1px solid ${statusFilter === v ? "#4b5563" : "#1a2640"}`,
                color: statusFilter === v ? "#e5e7eb" : "#6b7280",
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Mode filter */}
        <div className="flex gap-1">
          {[["all", "All Modes"], ["demo", "Demo"], ["live", "Live"]].map(([v, l]) => (
            <button key={v} onClick={() => setModeFilter(v)}
              className="px-2.5 py-1.5 rounded text-xs"
              style={{
                background: modeFilter === v ? "#374151" : "transparent",
                border: `1px solid ${modeFilter === v ? "#4b5563" : "#1a2640"}`,
                color: modeFilter === v ? "#e5e7eb" : "#6b7280",
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card text-center py-12">
          <RefreshCcw size={24} className="animate-spin mx-auto mb-3" style={{ color: "#374151" }} />
          <p className="text-sm" style={{ color: "#6b7280" }}>Loading scan history…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <History size={32} className="mx-auto mb-3" style={{ color: "#1a2640" }} />
          <p className="text-sm" style={{ color: "#6b7280" }}>
            {tasks.length === 0 ? "No scans yet. Run a module to get started." : "No scans match your filters."}
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #1a2640", background: "#0d1626" }}>
                {["Module", "Status", "Mode", "Started", "Duration", "Actions"].map(col => (
                  <th key={col} className="px-4 py-2.5 text-left">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#374151" }}>{col}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, idx) => {
                const color = MODULE_ACCENT[task.module_id] || "#6b7280";
                const Icon = MODULE_ICONS[task.module_id] || Shield;
                const isCreating = creating === task.task_id;
                return (
                  <tr key={task.task_id}
                    style={{ borderBottom: "1px solid #0d1626", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    {/* Module */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ background: `${color}18` }}>
                          <Icon size={11} style={{ color }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color }}>{MODULE_LABEL[task.module_id] || task.module_id.toUpperCase()}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>

                    {/* Mode */}
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-semibold"
                        style={{
                          background: task.mode === "demo" ? "rgba(249,115,22,0.12)" : "rgba(34,197,94,0.12)",
                          color: task.mode === "demo" ? "#f97316" : "#22c55e",
                          border: `1px solid ${task.mode === "demo" ? "rgba(249,115,22,0.3)" : "rgba(34,197,94,0.3)"}`,
                        }}>
                        {task.mode === "demo" ? "Demo" : "Live"}
                      </span>
                    </td>

                    {/* Started */}
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: "#9ca3af" }}>{timeAgo(task.created_at)}</span>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: "#6b7280" }}>
                        {duration(task.created_at, task.completed_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {task.has_result && (
                          <button onClick={() => handleViewResult(task)}
                            className="px-2 py-1 rounded text-xs flex items-center gap-1"
                            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa" }}>
                            <Play size={9} />
                            View
                          </button>
                        )}
                        <button onClick={() => handleCreateInvestigation(task)} disabled={isCreating}
                          className="px-2 py-1 rounded text-xs flex items-center gap-1"
                          style={{ background: "rgba(107,114,128,0.1)", border: "1px solid #1a2640", color: "#9ca3af" }}>
                          {isCreating ? <RefreshCcw size={9} className="animate-spin" /> : <FolderPlus size={9} />}
                          Case
                        </button>
                        <button onClick={() => navigate("/reports")}
                          className="px-2 py-1 rounded text-xs flex items-center gap-1"
                          style={{ background: "transparent", border: "1px solid #1a2640", color: "#6b7280" }}>
                          <FileText size={9} />
                          Report
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
