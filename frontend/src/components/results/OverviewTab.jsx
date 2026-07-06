import MatchRing from "../MatchRing";
import SkillBar from "../SkillBar";
import { titleCase } from "../../lib/format";

export default function OverviewTab({ analysis, onOpenReport, onPickAlternate }) {
  const matched = analysis.matched_skills || [];
  const missing = analysis.missing_skills || [];
  const totalKey = matched.length + missing.length;
  const alternates = analysis.alternate_suggestions || [];

  // Real data only: matched skills render as full-strength "have", missing as low "missing".
  const rows = [
    ...matched.map((s) => ({ name: s, strength: 100, have: true })),
    ...missing.map((s) => ({ name: s, strength: 12, have: false })),
  ];

  return (
    <div className="space-y-8">
      {/* Match score + context */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card flex flex-col items-center justify-center">
          <MatchRing percent={analysis.match_percent} label="Overall Match" />
          <p className="mt-4 text-center text-xs text-ink-soft">Weighted by skill importance (TF-IDF)</p>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card flex items-start gap-4">
            <span className="ms text-[24px] text-primary">insights</span>
            <div>
              <p className="font-bold text-ink">Analysis Context</p>
              <p className="mt-1 text-sm text-ink-soft">
                Based on <span className="font-semibold text-ink">{matched.length}</span> of{" "}
                <span className="font-semibold text-ink">{totalKey}</span> key skills for the{" "}
                <span className="font-semibold capitalize text-ink">{titleCase(analysis.target_role)}</span> role.
              </p>
            </div>
          </div>

          {alternates.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-warning/10 p-5 ring-1 ring-warning/20">
              <span className="ms text-[24px] text-warning">lightbulb</span>
              <p className="flex-1 text-sm font-medium text-ink">
                Your match is on the lower side — here {alternates.length === 1 ? "is" : "are"}{" "}
                {alternates.length} better-fitting alternative{alternates.length > 1 ? "s" : ""}:
              </p>
              <div className="flex flex-wrap gap-2">
                {alternates.map((alt) => (
                  <button
                    key={alt.role}
                    onClick={() => onPickAlternate?.(alt.role)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold capitalize text-ink shadow-sm transition hover:shadow-card-hover"
                  >
                    {titleCase(alt.role)}
                    <span className="text-success">{Math.round(alt.match_percent)}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Skill gap */}
      <div className="card">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Your Skill Gap</h2>
            <p className="text-sm text-ink-soft">Required skills vs. what you already have.</p>
          </div>
          <button onClick={onOpenReport} className="btn-secondary">
            <span className="ms text-[20px]">download</span>
            Export Full Report
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-ink-soft">No skill data available for this role.</p>
        ) : (
          <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
            {rows.map((row) => (
              <SkillBar key={`${row.name}-${row.have}`} {...row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
