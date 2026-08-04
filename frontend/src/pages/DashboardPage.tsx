import ModuleLoader from "@/components/modules/ModuleLoader";
import CommandCenter from "@/pages/CommandCenter";
import { useModulesStore } from "@/store";

export default function DashboardPage() {
  const { activeModuleId } = useModulesStore();
  return (
    <div className="flex gap-4 h-full">
      {!activeModuleId && <div className="flex-1 min-w-0"><CommandCenter /></div>}
      {activeModuleId && <div className="flex-1 min-w-0"><ModuleLoader moduleId={activeModuleId} /></div>}
    </div>
  );
}
