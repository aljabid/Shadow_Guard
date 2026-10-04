import { lazy, Suspense } from "react";
import Spinner from "@/components/common/Spinner";

const MODULE_COMPONENTS: Record<string, React.LazyExoticComponent<any>> = {
  kolkhoz: lazy(() => import("@/modules/kolkhoz/KolkhozPanel")),
  droper: lazy(() => import("@/modules/droper/DroperPanel")),
  piramida: lazy(() => import("@/modules/piramida/PiramidaPanel")),
  shadowbet: lazy(() => import("@/modules/shadowbet/ShadowBetPanel")),
  tengraf: lazy(() => import("@/modules/tengraf/TengrafPanel")),
  contraband: lazy(() => import("@/modules/contraband/ContrabandPanel")),
};

interface Props {
  moduleId: string;
}

export default function ModuleLoader({ moduleId }: Props) {
  const Component = MODULE_COMPONENTS[moduleId];

  if (!Component) {
    return (
      <div className="card text-center py-12">
        <p style={{ color: "var(--soc-muted)" }}>
          Module not found: {moduleId}
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Spinner size={24} />
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}