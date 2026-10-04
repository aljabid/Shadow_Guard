import { useEffect, useState } from "react";
import { useAuthStore, useUIStore } from "@/store";
import type { Theme } from "@/store/ui.store";
import { integrationsApi, ApiIntegration } from "@/api/integrations.api";
import {
  Settings, Wifi, WifiOff, AlertCircle, CheckCircle, RefreshCcw,
  Send, Link, Search, Globe, Moon, Database, Edit3, X, Save, Zap,
  User, ShieldCheck, Activity, Palette,
} from "lucide-react";

const TYPE_ICON: Record<string, React.ElementType> = {
  telegram: Send, blockchain: Link, osint: Search, search: Globe,
  darknet: Moon, internal: Database,
};
const TYPE_COLOR: Record<string, string> = {
  telegram: "#3b82f6", blockchain: "#f59e0b", osint: "#8b5cf6",
  search: "#06b6d4", darknet: "#ef4444", internal: "#10b981",
};
const TYPE_LABEL: Record<string, string> = {
  telegram: "Telegram", blockchain: "Blockchain", osint: "OSINT",
  search: "Search & Intel", darknet: "DarkNet", internal: "Internal",
};

const CONFIG_FIELDS: Record<string, { key: string; label: string; placeholder: string; secret?: boolean }[]> = {
  telegram_api:    [{ key: "api_id", label: "API ID", placeholder: "12345678" }, { key: "api_hash", label: "API Hash", placeholder: "abc123...", secret: true }, { key: "session_string", label: "Session String", placeholder: "1BVtsOH...", secret: true }],
  trongrid:        [{ key: "api_key", label: "TronGrid API Key", placeholder: "tg-...", secret: true }],
  etherscan:       [{ key: "api_key", label: "Etherscan API Key", placeholder: "ETHERSCAN_...", secret: true }],
  bitcoin_rpc:     [{ key: "rpc_url", label: "RPC URL", placeholder: "http://localhost:8332" }, { key: "username", label: "RPC Username", placeholder: "bitcoin" }, { key: "password", label: "RPC Password", placeholder: "••••••••", secret: true }],
  chainalysis:     [{ key: "api_key", label: "Chainalysis API Key", placeholder: "ch-...", secret: true }],
  shodan:          [{ key: "api_key", label: "Shodan API Key", placeholder: "shodan-...", secret: true }],
  virustotal:      [{ key: "api_key", label: "VirusTotal API Key", placeholder: "vt-...", secret: true }],
  haveibeenpwned:  [{ key: "api_key", label: "HIBP API Key", placeholder: "hibp-...", secret: true }],
  securitytrails:  [{ key: "api_key", label: "SecurityTrails API Key", placeholder: "st-...", secret: true }],
  whois_api:       [{ key: "api_key", label: "WHOIS API Key", placeholder: "whois-...", secret: true }],
  google_cse:      [{ key: "api_key", label: "Google API Key", placeholder: "AIza...", secret: true }, { key: "cx", label: "Search Engine ID (cx)", placeholder: "0123abc..." }],
  bing_search:     [{ key: "api_key", label: "Bing Search Key", placeholder: "bing-...", secret: true }],
  tor_gateway:     [{ key: "proxy_url", label: "SOCKS5 Proxy URL", placeholder: "socks5://127.0.0.1:9050" }],
  darknet_crawler: [{ key: "endpoint", label: "Crawler Endpoint", placeholder: "http://crawler:8080" }, { key: "api_key", label: "API Key", placeholder: "dc-...", secret: true }],
  afm_watchlist:   [{ key: "file_path", label: "CSV File Path", placeholder: "/data/watchlist.csv" }],
  json_feed:       [{ key: "feed_url", label: "Feed URL", placeholder: "http://feed.internal/intel.json" }, { key: "api_key", label: "API Key (optional)", placeholder: "feed-key..." }],
};

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected: "#22c55e", configured: "#60a5fa",
    error: "#ef4444", not_configured: "#374151", testing: "#f59e0b",
  };
  const labels: Record<string, string> = {
    connected: "Connected", configured: "Configured",
    error: "Error", not_configured: "Not Configured", testing: "Testing…",
  };
  const color = colors[status] || "#374151";
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: status === "connected" ? `0 0 6px ${color}` : "none" }} />
      <span className="text-xs" style={{ color }}>{labels[status] || status}</span>
    </div>
  );
}

/* ── Integration Config Modal ── */
function ConfigModal({ integration, onClose, onSave }: {
  integration: ApiIntegration; onClose: () => void; onSave: () => void;
}) {
  const fields = CONFIG_FIELDS[integration.name] || [{ key: "api_key", label: "API Key", placeholder: "Enter API key...", secret: true }];
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await integrationsApi.update(integration.id, { config: values });
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setSaving(true);
    setTesting(true);
    try {
      await integrationsApi.update(integration.id, { config: values });
      const result = await integrationsApi.test(integration.id);
      setTestResult(result);
    } finally {
      setSaving(false);
      setTesting(false);
    }
  };

  const TypeIcon = TYPE_ICON[integration.integration_type] || Settings;
  const color = TYPE_COLOR[integration.integration_type] || "#60a5fa";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-xl" style={{ background: "#111827", border: "1px solid #1a2640" }}>
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1a2640" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
              <TypeIcon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#e5e7eb" }}>{integration.display_name}</p>
              <p className="text-xs" style={{ color: "#6b7280" }}>{TYPE_LABEL[integration.integration_type]}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: "#6b7280" }}><X size={15} /></button>
        </div>

        <div className="p-5 space-y-3">
          {integration.description && (
            <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{integration.description}</p>
          )}

          {/* Show which keys are already saved in the DB */}
          {integration.config_keys && integration.config_keys.length > 0 && (
            <div className="p-2.5 rounded text-xs" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="font-semibold mb-1" style={{ color: "#60a5fa" }}>Already configured:</p>
              <p style={{ color: "#9ca3af" }}>{integration.config_keys.join(", ")}</p>
              <p className="mt-1" style={{ color: "#6b7280" }}>Leave fields blank to keep existing values. Only fill in what you want to change.</p>
            </div>
          )}

          {/* Special note for Telegram session_string */}
          {integration.name === "telegram_api" && !integration.config_keys?.includes("session_string") && (
            <div className="p-2.5 rounded text-xs" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <p className="font-semibold mb-1" style={{ color: "#f59e0b" }}>Session String required for live scans</p>
              <p style={{ color: "#9ca3af" }}>
                Run this command once from the backend folder to generate it:
              </p>
              <code className="block mt-1.5 px-2 py-1 rounded font-mono" style={{ background: "#0d1626", color: "#e5e7eb", fontSize: 10 }}>
                python generate_telegram_session.py
              </code>
              <p className="mt-1.5" style={{ color: "#9ca3af" }}>
                It will authenticate with your phone number and save the session automatically.
              </p>
            </div>
          )}

          <button onClick={() => setShowSecrets(v => !v)} className="text-xs flex items-center gap-1"
            style={{ color: "#6b7280" }}>
            {showSecrets ? "Hide" : "Show"} secret values
          </button>

          {fields.map(f => (
            <div key={f.key}>
              <label className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#9ca3af" }}>
                {f.label}
                {integration.config_keys?.includes(f.key) && (
                  <span className="px-1 py-0.5 rounded font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 9 }}>saved</span>
                )}
              </label>
              <input
                type={f.secret && !showSecrets ? "password" : "text"}
                value={values[f.key] || ""}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={integration.config_keys?.includes(f.key) ? `(keep existing — or type to replace)` : f.placeholder}
                className="w-full px-3 py-2 rounded text-xs"
                style={{ background: "#0d1626", border: "1px solid #1a2640", color: "#e5e7eb", fontFamily: f.secret ? "monospace" : "inherit" }} />
            </div>
          ))}

          {testResult && (
            <div className="p-3 rounded text-xs"
              style={{
                background: testResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${testResult.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                color: testResult.success ? "#22c55e" : "#ef4444",
              }}>
              {testResult.message}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={handleTest} disabled={saving}
            className="flex-1 py-2 rounded text-xs font-medium flex items-center justify-center gap-1.5"
            style={{ background: "transparent", border: "1px solid #1a2640", color: "#9ca3af" }}>
            <Zap size={11} />
            {testing ? "Testing…" : "Test Connection"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5"
            style={{ background: "#3b82f6", color: "white" }}>
            <Save size={11} />
            {saving ? "Saving…" : "Save Config"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Integration Card ── */
function IntegrationCard({ integration, onConfigure, onTest }: {
  integration: ApiIntegration;
  onConfigure: () => void;
  onTest: () => void;
}) {
  const TypeIcon = TYPE_ICON[integration.integration_type] || Settings;
  const color = TYPE_COLOR[integration.integration_type] || "#60a5fa";
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try { await onTest(); } finally { setTesting(false); }
  };

  return (
    <div className="card flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}>
        <TypeIcon size={18} style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>{integration.display_name}</p>
        {integration.description && (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "#6b7280" }}>{integration.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <StatusDot status={integration.status} />
          {integration.last_tested && (
            <span className="text-xs" style={{ color: "#4b5563" }}>
              Tested {new Date(integration.last_tested).toLocaleDateString()}
            </span>
          )}
          {integration.health_score != null && integration.status === "connected" && (
            <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>
              Health {integration.health_score}%
            </span>
          )}
          {integration.usage_count > 0 && (
            <span className="text-xs" style={{ color: "#4b5563" }}>
              {integration.usage_count} calls
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {integration.has_config && (
          <button onClick={handleTest} disabled={testing}
            className="px-2.5 py-1.5 rounded text-xs"
            style={{ background: "transparent", border: "1px solid #1a2640", color: "#9ca3af" }}>
            {testing ? <RefreshCcw size={11} className="animate-spin" /> : <Zap size={11} />}
          </button>
        )}
        <button onClick={onConfigure}
          className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5"
          style={{
            background: integration.has_config ? "rgba(59,130,246,0.12)" : "rgba(107,114,128,0.12)",
            border: `1px solid ${integration.has_config ? "rgba(59,130,246,0.3)" : "#1a2640"}`,
            color: integration.has_config ? "#60a5fa" : "#9ca3af",
          }}>
          <Edit3 size={11} />
          {integration.has_config ? "Edit" : "Configure"}
        </button>
      </div>
    </div>
  );
}

const TABS = ["Profile", "API Integrations", "Platform", "Appearance"] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const [activeTab, setActiveTab] = useState<Tab>("API Integrations");
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [configuring, setConfiguring] = useState<ApiIntegration | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  const isAdmin = user?.role === "admin";

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await integrationsApi.list();
      setIntegrations(data.integrations || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "API Integrations") loadIntegrations();
  }, [activeTab]);

  const grouped = integrations.reduce<Record<string, ApiIntegration[]>>((acc, i) => {
    if (!acc[i.integration_type]) acc[i.integration_type] = [];
    acc[i.integration_type].push(i);
    return acc;
  }, {});

  const filteredGroups = typeFilter === "all" ? grouped
    : { [typeFilter]: grouped[typeFilter] || [] };

  const connectedCount = integrations.filter(i => i.status === "connected" || i.status === "configured").length;
  const totalCount = integrations.length;

  return (
    <div>
      {configuring && (
        <ConfigModal integration={configuring} onClose={() => setConfiguring(null)}
          onSave={loadIntegrations} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold tracking-wide" style={{ color: "#e5e7eb" }}>Settings</h1>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
            Platform configuration and API integration management
          </p>
        </div>
        {activeTab === "API Integrations" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle size={11} style={{ color: "#22c55e" }} />
              <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>
                {connectedCount} / {totalCount} Configured
              </span>
            </div>
            <button onClick={loadIntegrations} disabled={loading}
              className="px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
              style={{ background: "var(--soc-surface-2)", border: "1px solid #1a2640", color: "#9ca3af" }}>
              <RefreshCcw size={11} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded" style={{ background: "#0d1626", border: "1px solid #1a2640" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded text-xs font-medium"
            style={{
              background: activeTab === tab ? "#3b82f6" : "transparent",
              color: activeTab === tab ? "white" : "#9ca3af",
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === "Profile" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)", border: "2px solid rgba(59,130,246,0.3)" }}>
                <User size={20} style={{ color: "#60a5fa" }} />
              </div>
              <div>
                <p className="text-base font-bold" style={{ color: "#e5e7eb" }}>{user?.username}</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>{user?.email || "analyst@afm.kz"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Role", value: (user?.role || "analyst").toUpperCase(), icon: ShieldCheck, color: "#60a5fa" },
                { label: "Access Level", value: user?.role === "admin" ? "Full Platform" : "Analyst", icon: Activity, color: "#22c55e" },
              ].map(item => (
                <div key={item.label} className="p-3 rounded" style={{ background: "#0d1626", border: "1px solid #1a2640" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon size={12} style={{ color: item.color }} />
                    <p className="text-xs" style={{ color: "#6b7280" }}>{item.label}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold mb-3" style={{ color: "#e5e7eb" }}>Platform Information</h2>
            <div className="space-y-2">
              {[
                { label: "Platform", value: "ShadowGuard Digital Intelligence Platform" },
                { label: "Version", value: "v1.0.0 — AFM Hackathon 2026" },
                { label: "Environment", value: "Development" },
                { label: "Modules", value: "6 Active (KOLKHOZ, DROPER, PIRAMIDA, SHADOWBET, TENGRAF, CONTRABAND)" },
                { label: "Operator", value: "AFM Kazakhstan — Financial Monitoring Department" },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid #0d1626" }}>
                  <span className="text-xs" style={{ color: "#6b7280" }}>{row.label}</span>
                  <span className="text-xs font-medium" style={{ color: "#9ca3af" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── API Integrations Tab ── */}
      {activeTab === "API Integrations" && (
        <div>
          {!isAdmin && (
            <div className="mb-4 p-3 rounded text-xs flex items-center gap-2"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }}>
              <AlertCircle size={12} />
              Administrator access required to configure API integrations. Contact your system administrator.
            </div>
          )}

          {/* Type filter */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {["all", ...Object.keys(TYPE_LABEL)].map(type => (
              <button key={type} onClick={() => setTypeFilter(type)}
                className="px-3 py-1 rounded text-xs font-medium"
                style={{
                  background: typeFilter === type ? (type === "all" ? "#374151" : `${TYPE_COLOR[type] || "#374151"}20`) : "transparent",
                  border: `1px solid ${typeFilter === type ? (type === "all" ? "#4b5563" : (TYPE_COLOR[type] || "#374151")) : "#1a2640"}`,
                  color: typeFilter === type ? (type === "all" ? "#e5e7eb" : (TYPE_COLOR[type] || "#e5e7eb")) : "#6b7280",
                }}>
                {type === "all" ? "All Sources" : TYPE_LABEL[type] || type}
                {type !== "all" && grouped[type] ? ` (${grouped[type].length})` : ""}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card text-center py-10">
              <RefreshCcw size={20} className="animate-spin mx-auto mb-3" style={{ color: "#374151" }} />
              <p className="text-sm" style={{ color: "#6b7280" }}>Loading integrations…</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(filteredGroups).map(([type, items]) => (
                items && items.length > 0 && (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      {(() => { const Icon = TYPE_ICON[type] || Settings; const color = TYPE_COLOR[type] || "#60a5fa"; return <Icon size={13} style={{ color }} />; })()}
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: TYPE_COLOR[type] || "#60a5fa" }}>
                        {TYPE_LABEL[type] || type}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {items.map(integration => (
                        <IntegrationCard key={integration.id} integration={integration}
                          onConfigure={() => isAdmin ? setConfiguring(integration) : undefined}
                          onTest={async () => { await integrationsApi.test(integration.id); loadIntegrations(); }} />
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Appearance Tab ── */}
      {activeTab === "Appearance" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Palette size={14} style={{ color: "#60a5fa" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--soc-text)" }}>Interface Theme</h2>
            </div>
            <p className="text-xs mb-5" style={{ color: "var(--soc-muted)" }}>
              Choose the appearance of the ShadowGuard interface.
              Intelligence panels maintain their dark display for optimal data visualization.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  {
                    id: "dark" as Theme,
                    label: "Dark",
                    desc: "Default intelligence console",
                    preview: { bg: "#0a0e1a", sidebar: "#080d18", card: "#111827", accent: "#3b82f6" },
                  },
                  {
                    id: "light" as Theme,
                    label: "Light",
                    desc: "Clean white interface",
                    preview: { bg: "#f0f4f8", sidebar: "#1e293b", card: "#ffffff", accent: "#2563eb" },
                  },
                  {
                    id: "cream" as Theme,
                    label: "Cream",
                    desc: "Warm parchment tone",
                    preview: { bg: "#faf6f0", sidebar: "#2d1e12", card: "#fdf9f4", accent: "#b45309" },
                  },
                ] as const
              ).map((t) => {
                const selected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className="p-3 rounded-lg text-left"
                    style={{
                      background: selected ? "rgba(59,130,246,0.08)" : "var(--soc-surface-2)",
                      border: `2px solid ${selected ? "#3b82f6" : "var(--soc-border)"}`,
                    }}
                  >
                    {/* Mini UI preview */}
                    <div
                      className="rounded overflow-hidden mb-2.5 flex gap-0"
                      style={{ height: 56, background: t.preview.bg }}
                    >
                      {/* Sidebar strip */}
                      <div
                        style={{ width: 16, background: t.preview.sidebar, flexShrink: 0 }}
                        className="flex flex-col items-center pt-1.5 gap-1"
                      >
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: t.preview.accent, opacity: 0.9 }} />
                        <div style={{ width: 6, height: 2, borderRadius: 1, background: "rgba(255,255,255,0.2)" }} />
                        <div style={{ width: 6, height: 2, borderRadius: 1, background: "rgba(255,255,255,0.12)" }} />
                        <div style={{ width: 6, height: 2, borderRadius: 1, background: "rgba(255,255,255,0.12)" }} />
                      </div>
                      {/* Content area */}
                      <div className="flex-1 p-1.5 flex flex-col gap-1">
                        {/* Topbar */}
                        <div style={{ height: 8, background: t.preview.sidebar, borderRadius: 2 }} />
                        {/* Cards */}
                        <div className="flex gap-1 flex-1">
                          {[0.9, 0.7, 0.5].map((op, i) => (
                            <div
                              key={i}
                              style={{
                                flex: 1, background: t.preview.card, borderRadius: 2,
                                opacity: op, border: `1px solid rgba(0,0,0,0.06)`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs font-bold" style={{ color: selected ? "#60a5fa" : "var(--soc-text)" }}>
                        {t.label}
                      </p>
                      {selected && (
                        <span className="text-xs px-1.5 py-0 rounded-full font-semibold"
                          style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontSize: 9 }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--soc-muted)" }}>{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--soc-text)" }}>Display Notes</h2>
            <div className="space-y-2">
              {[
                { label: "Intelligence Panels", value: "Always dark — optimized for data density and eye strain during long analysis sessions" },
                { label: "Theme Persistence", value: "Your preference is saved locally and restored on every login" },
                { label: "Transitions", value: "Smooth 250ms crossfade between themes" },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid var(--soc-border)" }}>
                  <span className="text-xs" style={{ color: "var(--soc-muted)" }}>{row.label}</span>
                  <span className="text-xs text-right max-w-xs" style={{ color: "var(--soc-text)", opacity: 0.8 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Platform Tab ── */}
      {activeTab === "Platform" && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold mb-3" style={{ color: "#e5e7eb" }}>Scan Mode Configuration</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: "Demo Mode", desc: "Uses curated AFM-grade scenarios for presentations. All 6 modules return instant, realistic results without external API calls.", status: "Available", color: "#22c55e" },
                { title: "Live Mode", desc: "Uses real Telegram API, blockchain feeds, DarkNet collectors, and OSINT sources. Requires configured integrations.", status: "Requires APIs", color: "#f59e0b" },
              ].map(item => (
                <div key={item.title} className="p-4 rounded" style={{ background: "#0d1626", border: "1px solid #1a2640" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <p className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>{item.title}</p>
                  </div>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: "#6b7280" }}>{item.desc}</p>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${item.color}15`, color: item.color }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold mb-3" style={{ color: "#e5e7eb" }}>Data Retention</h2>
            <div className="space-y-3">
              {[
                { label: "Scan Results", value: "Permanent — all results stored in PostgreSQL" },
                { label: "Investigations", value: "Permanent — persistent case management" },
                { label: "Alert History", value: "Permanent — full audit trail" },
                { label: "Evidence Packages", value: "90 days — PDF/ZIP on local storage" },
                { label: "Session Tokens", value: "15 min access / 7 day refresh" },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid #0d1626" }}>
                  <span className="text-xs" style={{ color: "#6b7280" }}>{row.label}</span>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold mb-3" style={{ color: "#e5e7eb" }}>Module Intelligence Coverage</h2>
            <div className="space-y-2">
              {[
                { module: "KOLKHOZ", coverage: "Crypto exchanges, OTC desks, withdrawal fraud", color: "#ef4444" },
                { module: "DROPER", coverage: "Money mule recruitment, Telegram networks, card fraud", color: "#f97316" },
                { module: "PIRAMIDA", coverage: "Ponzi schemes, MLM fraud, investment scams", color: "#eab308" },
                { module: "SHADOWBET", coverage: "Illegal gambling, unlicensed betting, operator networks", color: "#a855f7" },
                { module: "TENGRAF", coverage: "Cross-platform OSINT, DarkNet feeds, GitHub, Reddit", color: "#3b82f6" },
                { module: "CONTRABAND", coverage: "Drug trafficking, contraband markets, courier networks", color: "#10b981" },
              ].map(item => (
                <div key={item.module} className="flex items-center gap-3 py-1.5"
                  style={{ borderBottom: "1px solid #0d1626" }}>
                  <span className="text-xs font-bold w-24 flex-shrink-0" style={{ color: item.color }}>
                    {item.module}
                  </span>
                  <span className="text-xs" style={{ color: "#6b7280" }}>{item.coverage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
