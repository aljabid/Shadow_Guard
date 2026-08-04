import { TaskStatus } from "@/types";
import Spinner from "@/components/common/Spinner";
import { CheckCircle, XCircle } from "lucide-react";

interface Props { task: TaskStatus | null; isRunning: boolean; }

export default function TaskStatusBar({ task, isRunning }: Props) {
  if (!task && !isRunning) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded mt-3 text-xs"
      style={{ background: "var(--soc-surface-2)", border: "1px solid var(--soc-border)" }}>
      {isRunning && (
        <>
          <Spinner size={12} />
          <span style={{ color: "var(--soc-blue)" }}>
            {task?.status === "started" ? "Analysis running..." : "Queued..."}
          </span>
        </>
      )}
      {!isRunning && task?.status === "success" && (
        <>
          <CheckCircle size={12} style={{ color: "var(--soc-green)" }} />
          <span style={{ color: "var(--soc-green)" }}>Analysis complete</span>
          {task.completed_at && (
            <span style={{ color: "var(--soc-muted)" }}>
              — {new Date(task.completed_at).toLocaleTimeString()}
            </span>
          )}
        </>
      )}
      {!isRunning && task?.status === "failure" && (
        <>
          <XCircle size={12} style={{ color: "var(--soc-accent)" }} />
          <span style={{ color: "var(--soc-accent)" }}>Failed: {task.error || "Unknown error"}</span>
        </>
      )}
    </div>
  );
}
