export type ModuleId =
  | "kolkhoz"
  | "droper"
  | "piramida"
  | "shadowbet"
  | "tengraf";

export type ModuleStatus = "active" | "coming_soon" | "error" | "running";

export interface ModuleMeta {
  id: string;
  name: string;
  version?: string;
  description: string;
  status: ModuleStatus;
}

export interface ModuleRunRequest {
  input_data: Record<string, unknown>;
}

export interface TaskStatus {
  task_id: string;
  module_id: string;
  status: "queued" | "started" | "success" | "failure" | "revoked";
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface ModuleState {
  activeModuleId: string | null;
  currentTask: TaskStatus | null;
  isRunning: boolean;
  runningModules: Record<string, boolean>;
  lastResult: Record<string, unknown> | null;
}