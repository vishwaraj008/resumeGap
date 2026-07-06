import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFlow } from "../context/FlowContext";
import MatchRing from "../components/MatchRing";
import SkillPill from "../components/SkillPill";
import ReportModal from "../components/ReportModal";
import { EmptyState } from "../components/states";
import { statusColor, titleCase } from "../lib/format";

export default function Compare() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resume } = useFlow();
  const [report, setReport] = useState(null); // { matchResultId, role, matchPercent }

  const data = useMemo(() => {
    if (location.state?.data) return location.state.data;
    if (resume?.resumeId) {
      try {
        return JSON.parse(sessionStorage.getItem(`skillpath_compare_${resume.resumeId}`));
      } catch {
        return null;
      }
    }
    return null;
  }, [location.state, resume]);

  if (!data) {
    return (
      <EmptyState
        icon="compare_arrows"
        title="No comparison yet"
        subtitle="Run a comparison across 2–3 roles to see them side by side."
        action={
          <button onClick={() => navigate("/choose-role")} className="btn-primary">
            Start a Comparison
          </button>
        }
      />
    );
  }

  const valid = (data.comparisons || []).filter((c) => !c.error);
  const failed = (data.comparisons || []).filter((c) => c.error);

  const chartData = valid.map((c) => ({
    role: titleCase(c.target_role),
    match: Math.round(c.match_percent),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Role Comparison</h1>
          <p className="text-sm text-ink-soft">Your fit across {valid.length} roles, side by side.</p>
        </div>
        <button onClick={() => navigate("/choose-role")} className="btn-secondary">
          <span className="ms text-[20px]">tune</span>
          Change Roles
        </button>
      </div>

      {failed.length > 0 && (
        <div className="rounded-xl bg-warning/10 p-4 text-sm text-ink ring-1 ring-warning/20">
          Couldn't analyze: {failed.map((f) => titleCase(f.target_role)).join(", ")}. These roles
          may not be a close enough match to your current skills.
        </div>
      )}

      {/* Summary chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="mb-4 font-bold text-ink">Match % Overview</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="role" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(79,70,229,0.06)" }}
                formatter={(v) => [`${v}%`, "Match"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 13 }}
              />
              <Bar dataKey="match" radius={[8, 8, 0, 0]} barSize={56}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={statusColor(d.match).hex} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Columns */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {valid.map((c) => (
          <div key={c.match_result_id} className="card flex flex-col items-center text-center">
            <h3 className="mb-4 text-lg font-bold capitalize text-ink">{titleCase(c.target_role)}</h3>
            <MatchRing percent={c.match_percent} size={140} stroke={12} />
            <div className="mt-5 w-full">
              <p className="mb-2 text-left text-sm font-semibold text-ink">
                Top missing skills
              </p>
              <div className="flex flex-wrap gap-2">
                {(c.missing_skills || []).slice(0, 5).map((s) => (
                  <SkillPill key={s} label={s} variant="missing" />
                ))}
                {(!c.missing_skills || c.missing_skills.length === 0) && (
                  <span className="text-sm text-success">No gaps — great fit!</span>
                )}
              </div>
            </div>
            <div className="mt-5 flex w-full gap-2">
              <button
                onClick={() => navigate(`/results/${c.match_result_id}`)}
                className="btn-secondary flex-1"
              >
                View
              </button>
              <button
                onClick={() =>
                  setReport({
                    matchResultId: c.match_result_id,
                    role: c.target_role,
                    matchPercent: c.match_percent,
                  })
                }
                className="btn-primary flex-1"
              >
                Report
              </button>
            </div>
          </div>
        ))}
      </div>

      <ReportModal
        open={Boolean(report)}
        onClose={() => setReport(null)}
        matchResultId={report?.matchResultId}
        role={report?.role}
        matchPercent={report?.matchPercent}
      />
    </div>
  );
}
