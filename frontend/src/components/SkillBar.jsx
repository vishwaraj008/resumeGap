import { titleCase } from "../lib/format";

// A single skill row: name, an importance-weighted bar, and a have/missing tag.
// `strength` 0-100 drives the bar WIDTH (how important this skill is to the
// role, relative to the heaviest one); the color reflects have (green) vs.
// missing (red), so a long red bar reads as "important skill you're missing".
export default function SkillBar({ name, strength, have, importance }) {
  const barColor = have ? "bg-success" : "bg-danger";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{titleCase(name)}</span>
        {have ? (
          <span className="pill bg-success/10 text-success">You have this</span>
        ) : (
          <span className="pill bg-danger/10 text-danger">Missing</span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-dim">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${Math.max(4, Math.min(100, strength))}%` }}
        />
      </div>
      {importance && (
        <p className="mt-1 text-right text-xs text-ink-soft">{importance}</p>
      )}
    </div>
  );
}
