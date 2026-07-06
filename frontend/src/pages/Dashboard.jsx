import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../api/history";
import { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { LoadingBlock, ErrorBanner, EmptyState } from "../components/states";
import { formatDate, statusColor, titleCase } from "../lib/format";

export default function Dashboard() {
  const navigate = useNavigate();
  const { email } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getHistory()
      .then(setData)
      .catch((e) => setError(apiError(e, "Failed to load your dashboard.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock label="Loading your dashboard..." />;
  if (error) return <ErrorBanner message={error} />;

  const analyses = [];
  (data?.history || []).forEach((r) =>
    (r.analyses || []).forEach((a) => analyses.push(a))
  );
  analyses.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
  const bestMatch = analyses.reduce((m, a) => Math.max(m, a.match_percent), 0);
  const name = email?.split("@")[0] || "there";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-[#7c3aed] p-8 text-white shadow-card">
        <h1 className="text-2xl font-bold capitalize">Welcome back, {name} 👋</h1>
        <p className="mt-1 max-w-lg text-white/80">
          Pick a target role and see exactly what stands between you and your next step.
        </p>
        <button
          onClick={() => navigate("/add-skills")}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white/90"
        >
          <span className="ms text-[20px]">bolt</span>
          Start New Analysis
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <StatTile icon="analytics" label="Total analyses" value={analyses.length} />
        <StatTile icon="description" label="Resumes uploaded" value={data?.total_resumes || 0} />
        <StatTile
          icon="military_tech"
          label="Best match"
          value={analyses.length ? `${Math.round(bestMatch)}%` : "—"}
        />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Recent analyses</h2>
          {analyses.length > 0 && (
            <button onClick={() => navigate("/history")} className="text-sm font-semibold text-primary hover:underline">
              View all
            </button>
          )}
        </div>

        {analyses.length === 0 ? (
          <EmptyState
            icon="rocket_launch"
            title="No analyses yet"
            subtitle="Run your first skill-gap analysis to get a personalized roadmap."
            action={
              <button onClick={() => navigate("/add-skills")} className="btn-primary">
                Start Now
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {analyses.slice(0, 4).map((a) => {
              const c = statusColor(a.match_percent);
              return (
                <button
                  key={a.match_result_id}
                  onClick={() => navigate(`/results/${a.match_result_id}`)}
                  className="card flex items-center justify-between text-left transition hover:shadow-card-hover"
                >
                  <div>
                    <p className="font-semibold capitalize text-ink">{titleCase(a.target_role)}</p>
                    <p className="text-xs text-ink-soft">{formatDate(a.created_at)}</p>
                  </div>
                  <span className={`pill ${c.soft} ${c.text}`}>{Math.round(a.match_percent)}%</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
        <span className="ms text-[26px] text-primary">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-ink">{value}</p>
        <p className="text-xs font-medium text-ink-soft">{label}</p>
      </div>
    </div>
  );
}
