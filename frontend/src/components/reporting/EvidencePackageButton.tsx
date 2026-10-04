import { useState } from "react";
import { reportsApi } from "@/api/reports.api";
import { FileDown } from "lucide-react";
import Spinner from "@/components/common/Spinner";

interface Props { moduleId: string; taskId: string | null; }

export default function EvidencePackageButton({ moduleId, taskId }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleGenerate = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      await reportsApi.generate({ module_id: moduleId, task_id: taskId });
      setDone(true);
    } catch { /* handle silently */ }
    finally { setLoading(false); }
  };

  return (
    <button onClick={handleGenerate} disabled={loading || !taskId || done}
      className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium"
      style={{
        background: done ? "rgba(16,185,129,0.12)" : "rgba(233,69,96,0.12)",
        color: done ? "var(--soc-green)" : "var(--soc-accent)",
        border: `1px solid ${done ? "rgba(16,185,129,0.3)" : "rgba(233,69,96,0.3)"}`,
        opacity: !taskId ? 0.5 : 1,
        cursor: !taskId ? "not-allowed" : "pointer",
      }}>
      {loading ? <Spinner size={10} /> : <FileDown size={12} />}
      {done ? "Report Generated" : "Generate Evidence Package"}
    </button>
  );
}
