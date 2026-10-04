import { Play, RotateCcw, CheckCircle2 } from "lucide-react";
import TaskStatusBar from "@/components/modules/TaskStatusBar";
import { TaskStatus } from "@/types";

interface Props {
  isRunning: boolean;
  isResolving: boolean;
  onRun: () => void;
  onResolve: () => void;
  task: TaskStatus | null;
  runLabel?: string;
  resolveLabel?: string;
  playback?: boolean;
  onPlaybackChange?: (val: boolean) => void;
  playbackLabel?: string;
  noteText?: string;
}

export default function ModuleControlBar({
  isRunning,
  isResolving,
  onRun,
  onResolve,
  task,
  runLabel,
  resolveLabel,
  playback,
  onPlaybackChange,
  playbackLabel,
  noteText,
}: Props) {
  return (
    <div className="card mb-5">
      <div className="flex items-center gap-4 flex-wrap">
        {onPlaybackChange !== undefined && (
          <label
            className="flex items-center gap-2 text-xs cursor-pointer"
            style={{ color: "var(--soc-text)" }}
          >
            <input
              type="checkbox"
              checked={playback}
              onChange={(e) => onPlaybackChange(e.target.checked)}
            />
            {playbackLabel || "Playback Mode"}
          </label>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold"
            style={{
              background: "var(--soc-accent)",
              color: "white",
              opacity: isRunning ? 0.6 : 1,
            }}
          >
            {isRunning ? (
              <RotateCcw size={12} className="animate-spin" />
            ) : (
              <Play size={12} />
            )}
            {isRunning ? "Running..." : runLabel || "Run Scan"}
          </button>

          <button
            onClick={onResolve}
            disabled={isResolving}
            className="flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold"
            style={{
              background: "rgba(16,185,129,0.12)",
              color: "var(--soc-green)",
              border: "1px solid rgba(16,185,129,0.3)",
              opacity: isResolving ? 0.6 : 1,
            }}
          >
            {isResolving ? (
              <RotateCcw size={12} className="animate-spin" />
            ) : (
              <CheckCircle2 size={12} />
            )}
            {isResolving ? "Resolving..." : resolveLabel || "Resolve All"}
          </button>
        </div>
      </div>

      {noteText && (
        <p className="text-xs mt-2" style={{ color: "var(--soc-muted)" }}>
          {noteText}
        </p>
      )}

      <TaskStatusBar task={task} isRunning={isRunning} />
    </div>
  );
}
