import { create } from "zustand";
import { ModuleState, TaskStatus, ModuleMeta } from "@/types";

interface ModulesStore extends ModuleState {
  modules: ModuleMeta[];

  resultsByModule: Record<string, Record<string, unknown> | null>;
  tasksByModule: Record<string, TaskStatus | null>;

  setModules: (modules: ModuleMeta[]) => void;
  setActiveModule: (id: string | null) => void;

  setTask: (moduleId: string, task: TaskStatus | null) => void;
  setRunning: (moduleId: string, running: boolean) => void;

  setLastResult: (
    moduleId: string,
    result: Record<string, unknown> | null
  ) => void;

  hydrateFromBackend: (payload: {
    results: Record<string, Record<string, unknown> | null>;
    tasks: Record<string, TaskStatus | null>;
  }) => void;

  getModuleResult: (moduleId: string) => Record<string, unknown> | null;
  getModuleTask: (moduleId: string) => TaskStatus | null;

  reset: () => void;
}

export const useModulesStore = create<ModulesStore>((set, get) => ({
  modules: [],

  activeModuleId: null,
  currentTask: null,
  isRunning: false,
  runningModules: {},
  lastResult: null,

  resultsByModule: {},
  tasksByModule: {},

  setModules: (modules) => set({ modules }),

  setActiveModule: (id) => {
    if (!id) {
      set({
        activeModuleId: null,
        currentTask: null,
        lastResult: null,
      });
      return;
    }

    const savedResult = get().resultsByModule[id] || null;
    const savedTask = get().tasksByModule[id] || null;

    set({
      activeModuleId: id,
      currentTask: savedTask,
      lastResult: savedResult,
    });
  },

  setTask: (moduleId, task) =>
    set((state) => {
      const isActive = state.activeModuleId === moduleId;

      return {
        currentTask: isActive ? task : state.currentTask,
        tasksByModule: {
          ...state.tasksByModule,
          [moduleId]: task,
        },
      };
    }),

  setRunning: (moduleId, running) =>
    set((state) => {
      const updated = { ...state.runningModules, [moduleId]: running };
      return {
        runningModules: updated,
        isRunning: Object.values(updated).some(Boolean),
      };
    }),

  setLastResult: (moduleId, result) =>
    set((state) => {
      const isActive = state.activeModuleId === moduleId;

      return {
        lastResult: isActive ? result : state.lastResult,
        resultsByModule: {
          ...state.resultsByModule,
          [moduleId]: result,
        },
      };
    }),

  hydrateFromBackend: (payload) =>
    set((state) => {
      const activeId = state.activeModuleId;
      const results = payload?.results || {};
      const tasks = payload?.tasks || {};

      return {
        resultsByModule: results,
        tasksByModule: tasks,
        lastResult: activeId ? results[activeId] || null : state.lastResult,
        currentTask: activeId ? tasks[activeId] || null : state.currentTask,
      };
    }),

  getModuleResult: (moduleId) => get().resultsByModule[moduleId] || null,

  getModuleTask: (moduleId) => get().tasksByModule[moduleId] || null,

  reset: () =>
    set({
      currentTask: null,
      isRunning: false,
      runningModules: {},
      lastResult: null,
    }),
}));