import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { investigationsApi, InvestigationSummary } from "@/api/investigations.api";
import {
  FolderOpen, Plus, Search, RefreshCcw, X, Shield, ShieldAlert,
  Clock, CheckCircle, Archive, ChevronRight, AlertTriangle, Trash2,
  FileText, TrendingUp, Dice6, PackageSearch, Network,
} from "lucide-react";

const MODULE_ACCENT: Record<string, string> = {
  kolkhoz: "#ef4444", droper: "#f97316", piramida: "#eab308",
  shadowbet: "#a855f7", tengraf: "#3b82f6", contraband: "#10b981",
};
const MODULE_LABEL: Record<string, string> = {
  kolkhoz: "KOLKHOZ", droper: "DROPER", piramida: "PIRAMIDA",
  shadowbet: "SHADOWBET", tengraf: "TENGRAF", contraband: "CONTRABAND",
};

const RISK_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};
const STATUS_ICON: Record<string, React.ElementType> = {
  open: FolderOpen, in_progress: Clock, closed: CheckCircle, archived: Archive,
};
const STATUS_COLOR: Record<string, string> = {
  open: "#60a5fa", in_progress: "#f97316", closed: "#22c55e", archived: "#6b7280",
};

function RiskPill({ level }: { level: string }) {
  const color = RISK_COLOR[level] || "#6b7280";
  return (
    <span className="text-xs px-2 py-0.5 rounded font-bold uppercase"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {level}
    </span>
  );
}

function ModulePill({ moduleId }: { moduleId: string }) {
  const color = MODULE_ACCENT[moduleId] || "#6b7280";
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {MODULE_LABEL[moduleId] || moduleId.toUpperCase()}
    </span>
  );
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

/* ── Create Investigation Modal ── */
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [riskLevel, setRiskLevel] = useState("high");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await investigationsApi.create({ title: title.trim(), description: description.trim() || undefined, risk_level: riskLevel, analyst_notes: notes.trim() || undefined });
      onCreate();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg rounded-xl p-6"
        style={{ background: "#111827", border: "1px solid #1a2640" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: "#e5e7eb" }}>New Investigation</h2>
          <button onClick={onClose} style={{ color: "#6b7280" }}><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#9ca3af" }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. RAKS Exchange Fraud — Q2 2024"
              className="w-full px-3 py-2 rounded text-sm"
              style={{ background: "#0d1626", border: "1px solid #1a2640", color: "#e5e7eb" }} />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#9ca3af" }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this investigation..."
              rows={3} className="w-full px-3 py-2 rounded text-sm resize-none"
              style={{ background: "#0d1626", border: "1px solid #1a2640", color: "#e5e7eb" }} />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#9ca3af" }}>Initial Risk Level</label>
            <div className="flex gap-2">
              {["critical", "high", "medium", "low"].map(level => (
                <button key={level} onClick={() => setRiskLevel(level)}
                  className="flex-1 py-1.5 rounded text-xs font-bold uppercase"
                  style={{
                    background: riskLevel === level ? `${RISK_COLOR[level]}25` : "transparent",
                    border: `1px solid ${riskLevel === level ? RISK_COLOR[level] : "#1a2640"}`,
                    color: riskLevel === level ? RISK_COLOR[level] : "#6b7280",
                  }}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#9ca3af" }}>Initial Analyst Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Initial observations, scope, hypotheses..."
              rows={2} className="w-full px-3 py-2 rounded text-sm resize-none"
              style={{ background: "#0d1626", border: "1px solid #1a2640", color: "#e5e7eb" }} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded text-sm"
            style={{ background: "transparent", border: "1px solid #1a2640", color: "#9ca3af" }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={!title.trim() || loading}
            className="flex-1 py-2 rounded text-sm font-semibold"
            style={{ background: loading || !title.trim() ? "#374151" : "#3b82f6", color: "white" }}>
            {loading ? "Creating…" : "Create Investigation"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Investigation Detail Panel ── */
function DetailPanel({ inv, onClose, onDelete, onStatusChange }: {
  inv: InvestigationSummary; onClose: () => void;
  onDelete: () => void; onStatusChange: (status: string) => void;
}) {
  const navigate = useNavigate();
  const StatusIcon = STATUS_ICON[inv.status] || FolderOpen;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await investigationsApi.delete(inv.id);
    onDelete();
  };

  const handleStatus = async (s: string) => {
    await investigationsApi.update(inv.id, { status: s as InvestigationSummary["status"] });
    onStatusChange(s);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 flex flex-col"
      style={{ background: "#0d1626", borderLeft: "1px solid #1a2640", boxShadow: "-4px 0 24px rgba(0,0,0,0.5)" }}>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1a2640" }}>
        <div className="flex items-center gap-2">
          <StatusIcon size={14} style={{ color: STATUS_COLOR[inv.status] }} />
          <span className="text-xs font-bold uppercase" style={{ color: STATUS_COLOR[inv.status] }}>{inv.status.replace("_", " ")}</span>
        </div>
        <button onClick={onClose} style={{ color: "#6b7280" }}><X size={15} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* title + risk */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-sm font-bold leading-snug" style={{ color: "#e5e7eb" }}>{inv.title}</h2>
            <RiskPill level={inv.risk_level} />
          </div>
          {inv.description && <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{inv.description}</p>}
        </div>

        {/* meta */}
        <div className="rounded p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1a2640" }}>
          {[
            { label: "Findings", value: String(inv.findings_count) },
            { label: "Modules", value: inv.module_ids.length ? "" : "None" },
            { label: "Created by", value: inv.created_by_username || "Unknown" },
            { label: "Created", value: timeAgo(inv.created_at) },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "#6b7280" }}>{row.label}</span>
              {row.label === "Modules" ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {inv.module_ids.length ? inv.module_ids.map(m => <ModulePill key={m} moduleId={m} />) : <span className="text-xs" style={{ color: "#6b7280" }}>None</span>}
                </div>
              ) : (
                <span className="text-xs font-semibold" style={{ color: "#e5e7eb" }}>{row.value}</span>
              )}
            </div>
          ))}
        </div>

        {/* analyst notes */}
        {inv.analyst_notes && (
          <div className="rounded p-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#60a5fa" }}>Analyst Notes</p>
            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#9ca3af" }}>{inv.analyst_notes}</p>
          </div>
        )}

        {/* status change */}
        <div>
          <p className="text-xs mb-2" style={{ color: "#6b7280" }}>Change Status</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[["open", "Open"], ["in_progress", "In Progress"], ["closed", "Closed"], ["archived", "Archived"]].map(([s, label]) => (
              <button key={s} onClick={() => handleStatus(s)}
                disabled={inv.status === s}
                className="py-1.5 rounded text-xs font-medium"
                style={{
                  background: inv.status === s ? `${STATUS_COLOR[s]}20` : "transparent",
                  border: `1px solid ${inv.status === s ? STATUS_COLOR[s] : "#1a2640"}`,
                  color: inv.status === s ? STATUS_COLOR[s] : "#6b7280",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* footer actions */}
      <div className="p-4 space-y-2" style={{ borderTop: "1px solid #1a2640" }}>
        {inv.module_ids[0] && (
          <button onClick={() => navigate(`/investigation/${inv.module_ids[0]}/0`)}
            className="w-full py-2 rounded text-xs font-semibold flex items-center justify-center gap-2"
            style={{ background: "#3b82f6", color: "white" }}>
            <FileText size={12} />
            View First Finding
          </button>
        )}
        <button onClick={() => navigate("/reports")}
          className="w-full py-2 rounded text-xs font-medium"
          style={{ background: "transparent", border: "1px solid #1a2640", color: "#9ca3af" }}>
          Generate Evidence Package
        </button>
        <button onClick={handleDelete} disabled={deleting}
          className="w-full py-2 rounded text-xs font-medium flex items-center justify-center gap-2"
          style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
          <Trash2 size={12} />
          {deleting ? "Deleting…" : "Delete Investigation"}
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<InvestigationSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await investigationsApi.list();
      setInvestigations(data.investigations || []);
    } catch {
      setInvestigations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = investigations.filter(inv => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (riskFilter !== "all" && inv.risk_level !== riskFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return inv.title.toLowerCase().includes(q)
        || (inv.description || "").toLowerCase().includes(q)
        || inv.module_ids.some(m => m.includes(q));
    }
    return true;
  });

  const counts = { all: investigations.length, open: 0, in_progress: 0, closed: 0, archived: 0 };
  for (const inv of investigations) {
    if (inv.status in counts) (counts as Record<string, number>)[inv.status]++;
  }

  return (
    <div className="relative">
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={load} />}
      {selected && (
        <DetailPanel inv={selected} onClose={() => setSelected(null)}
          onDelete={() => { setSelected(null); load(); }}
          onStatusChange={newStatus => {
            setInvestigations(prev => prev.map(i => i.id === selected.id ? { ...i, status: newStatus as InvestigationSummary["status"] } : i));
            setSelected(prev => prev ? { ...prev, status: newStatus as InvestigationSummary["status"] } : null);
          }} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold tracking-wide" style={{ color: "#e5e7eb" }}>Investigations</h1>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
            Active cases, evidence packages, and cross-module intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
            style={{ background: "var(--soc-surface-2)", border: "1px solid #1a2640", color: "#9ca3af" }}>
            <RefreshCcw size={11} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5"
            style={{ background: "#3b82f6", color: "white" }}>
            <Plus size={12} />
            New Investigation
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total Cases", value: investigations.length, color: "#60a5fa" },
          { label: "Open", value: counts.open, color: "#60a5fa" },
          { label: "In Progress", value: counts.in_progress, color: "#f97316" },
          { label: "Closed", value: counts.closed, color: "#22c55e" },
          { label: "Archived", value: counts.archived, color: "#6b7280" },
        ].map(item => (
          <div key={item.label} className="card">
            <p className="text-xs" style={{ color: "#6b7280" }}>{item.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7280" }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search investigations…"
            className="w-full pl-8 pr-3 py-1.5 rounded text-xs"
            style={{ background: "#0d1626", border: "1px solid #1a2640", color: "#e5e7eb" }} />
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          {[["all", "All"], ["open", "Open"], ["in_progress", "In Progress"], ["closed", "Closed"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className="px-3 py-1.5 rounded text-xs font-medium"
              style={{
                background: statusFilter === v ? "#3b82f6" : "transparent",
                border: `1px solid ${statusFilter === v ? "#3b82f6" : "#1a2640"}`,
                color: statusFilter === v ? "white" : "#9ca3af",
              }}>
              {l} {v !== "all" && counts[v as keyof typeof counts] > 0 ? `(${counts[v as keyof typeof counts]})` : ""}
            </button>
          ))}
        </div>

        {/* Risk filter */}
        <div className="flex gap-1">
          {[["all", "All Risk"], ["critical", "Critical"], ["high", "High"], ["medium", "Medium"]].map(([v, l]) => (
            <button key={v} onClick={() => setRiskFilter(v)}
              className="px-2.5 py-1.5 rounded text-xs font-medium"
              style={{
                background: riskFilter === v ? `${v === "all" ? "#374151" : RISK_COLOR[v]}25` : "transparent",
                border: `1px solid ${riskFilter === v ? (v === "all" ? "#4b5563" : RISK_COLOR[v]) : "#1a2640"}`,
                color: riskFilter === v ? (v === "all" ? "#9ca3af" : RISK_COLOR[v]) : "#6b7280",
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card text-center py-12">
          <RefreshCcw size={24} className="animate-spin mx-auto mb-3" style={{ color: "#374151" }} />
          <p className="text-sm" style={{ color: "#6b7280" }}>Loading investigations…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <FolderOpen size={40} className="mx-auto mb-4" style={{ color: "#1a2640" }} />
          <p className="text-sm font-semibold mb-2" style={{ color: "#9ca3af" }}>
            {investigations.length === 0 ? "No investigations yet" : "No matches"}
          </p>
          <p className="text-xs mb-4" style={{ color: "#4b5563" }}>
            {investigations.length === 0
              ? "Run a module scan, then save findings to create your first investigation."
              : "Try adjusting your search or filter criteria."}
          </p>
          {investigations.length === 0 && (
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded text-xs font-semibold"
              style={{ background: "#3b82f6", color: "white" }}>
              Create Investigation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => {
            const StatusIcon = STATUS_ICON[inv.status] || FolderOpen;
            return (
              <div key={inv.id}
                className="card cursor-pointer hover:border-blue-500/30 transition-colors"
                style={{ borderColor: selected?.id === inv.id ? "rgba(59,130,246,0.4)" : undefined }}
                onClick={() => setSelected(inv)}>
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: `${STATUS_COLOR[inv.status]}15` }}>
                    <StatusIcon size={14} style={{ color: STATUS_COLOR[inv.status] }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "#e5e7eb" }}>{inv.title}</p>
                      <RiskPill level={inv.risk_level} />
                    </div>

                    {inv.description && (
                      <p className="text-xs mb-2 leading-relaxed line-clamp-1" style={{ color: "#6b7280" }}>
                        {inv.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {inv.module_ids.map(m => <ModulePill key={m} moduleId={m} />)}
                      {inv.findings_count > 0 && (
                        <span className="text-xs" style={{ color: "#4b5563" }}>
                          {inv.findings_count} finding{inv.findings_count !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "#4b5563" }}>{timeAgo(inv.created_at)}</span>
                      {inv.created_by_username && (
                        <span className="text-xs" style={{ color: "#4b5563" }}>by {inv.created_by_username}</span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={14} style={{ color: "#374151", flexShrink: 0 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
