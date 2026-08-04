import {
  AlertCircle,
  PackageSearch,
  Radar,
  ShieldCheck,
} from "lucide-react";

interface Props {
  hasError?: boolean;
  error?: string;
}

export default function ContrabandEmptyState({
  hasError = false,
  error,
}: Props) {
  if (hasError) {
    return (
      <div className="card relative overflow-hidden">
        <div
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
          style={{
            background: "rgba(239,68,68,0.12)",
          }}
        />

        <div className="relative flex flex-col items-center text-center py-10">
          <div
            className="mb-4 p-4 rounded-full"
            style={{
              background: "rgba(239,68,68,0.12)",
              color: "var(--soc-red)",
            }}
          >
            <AlertCircle size={28} />
          </div>

          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--soc-text)" }}
          >
            Intelligence Collection Failed
          </h3>

          <p
            className="text-sm max-w-xl"
            style={{ color: "var(--soc-muted)" }}
          >
            CONTRABAND-KZ could not collect intelligence from the
            configured sources. Verify collector credentials,
            network connectivity, and platform API access.
          </p>

          {error && (
            <div
              className="mt-4 p-3 rounded text-xs max-w-2xl"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "var(--soc-red)",
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card relative overflow-hidden">
      <div
        className="absolute -left-12 -top-12 h-36 w-36 rounded-full blur-3xl"
        style={{
          background: "rgba(16,185,129,0.08)",
        }}
      />

      <div className="relative flex flex-col items-center text-center py-12">
        <div className="flex gap-3 mb-5">
          <div
            className="p-3 rounded-full"
            style={{
              background: "rgba(16,185,129,0.12)",
              color: "var(--soc-green)",
            }}
          >
            <ShieldCheck size={22} />
          </div>

          <div
            className="p-3 rounded-full"
            style={{
              background: "rgba(59,130,246,0.12)",
              color: "var(--soc-accent)",
            }}
          >
            <Radar size={22} />
          </div>

          <div
            className="p-3 rounded-full"
            style={{
              background: "rgba(168,85,247,0.12)",
              color: "#a855f7",
            }}
          >
            <PackageSearch size={22} />
          </div>
        </div>

        <h3
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--soc-text)" }}
        >
          No Contraband Indicators Detected
        </h3>

        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--soc-muted)" }}
        >
          No active courier networks, illegal vape vendors,
          alcohol trafficking groups, DarkNet listings, or drug
          distribution indicators were identified during this scan.
        </p>

        <div className="mt-6 flex gap-2 flex-wrap justify-center">
          <span
            className="px-3 py-1 rounded text-xs"
            style={{
              background: "rgba(16,185,129,0.1)",
              color: "var(--soc-green)",
            }}
          >
            No Drug Markets
          </span>

          <span
            className="px-3 py-1 rounded text-xs"
            style={{
              background: "rgba(16,185,129,0.1)",
              color: "var(--soc-green)",
            }}
          >
            No Vape Vendors
          </span>

          <span
            className="px-3 py-1 rounded text-xs"
            style={{
              background: "rgba(16,185,129,0.1)",
              color: "var(--soc-green)",
            }}
          >
            No Alcohol Networks
          </span>

          <span
            className="px-3 py-1 rounded text-xs"
            style={{
              background: "rgba(16,185,129,0.1)",
              color: "var(--soc-green)",
            }}
          >
            No Courier Cells
          </span>
        </div>
      </div>
    </div>
  );
}