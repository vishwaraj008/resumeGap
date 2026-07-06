import { titleCase } from "../lib/format";

// Renders the backend's { nodes:[{role,level,is_current_fit}], edges:[{from,to}] }
// as a left-to-right career node graph (stacks vertically on mobile).
export default function TrajectoryGraph({ graph }) {
  const nodes = graph?.nodes || [];
  if (nodes.length === 0) {
    return <p className="text-sm text-ink-soft">No trajectory available for this role.</p>;
  }

  return (
    <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
      {nodes.map((node, i) => {
        const current = node.is_current_fit && (i === 0 || !nodes[i + 1]?.is_current_fit);
        return (
          <div key={node.role} className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
            <div
              className={`relative flex min-w-[190px] flex-1 flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition ${
                node.is_current_fit
                  ? "border-primary bg-primary-light"
                  : "border-line bg-white"
              }`}
            >
              {current && (
                <span className="absolute -top-3 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-white">
                  You are here
                </span>
              )}
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  node.is_current_fit ? "bg-primary text-white" : "bg-surface-dim text-ink-soft"
                }`}
              >
                <span className="ms text-[24px]">
                  {node.level === 1 ? "school" : node.level === 2 ? "work" : "workspace_premium"}
                </span>
              </div>
              <p className="text-sm font-bold text-ink">{titleCase(node.role)}</p>
              <span className="text-xs font-medium text-ink-soft">Stage {node.level}</span>
            </div>

            {i < nodes.length - 1 && (
              <span className="ms rotate-90 self-center text-[28px] text-ink-soft lg:rotate-0">
                arrow_forward
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
