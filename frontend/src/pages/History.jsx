import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../api/history";
import { apiError } from "../api/client";
import { LoadingBlock, ErrorBanner, EmptyState } from "../components/states";
import ReportModal from "../components/ReportModal";
import { formatDate, statusColor, titleCase } from "../lib/format";

export default function History() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [report, setReport] = useState(null);

  const load = () => {
    setLoading(true);
    setError("");
    getHistory()
      .then(setData)
      .catch((e) => setError(apiError(e, "Failed to load history.")))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Flatten all analyses across resumes into newest-first rows.
  const rows = useMemo(() => {
    if (!data?.history) return [];
    const all = [];
    data.history.forEach((resume) => {
      (resume.analyses || []).forEach((a) => {
        all.push({ ...a, skill_count: resume.skill_count });
      });
    });
    all.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
    const q = query.trim().toLowerCase();
    return q ? all.filter((r) => r.target_role.toLowerCase().includes(q)) : all;
  }, [data, query]);

  if (loading) return <LoadingBlock label="Loading your history..." />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  const hasAny = data?.history?.some((r) => r.analyses?.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Your Analysis History</h1>
          <p className="text-sm text-ink-soft">Revisit past skill-gap analyses and reports.</p>
        </div>
        <button onClick={() => navigate("/add-skills")} className="btn-primary">
          <span className="ms text-[20px]">add</span>
          New Analysis
        </button>
      </div>

      {!hasAny ? (
        <EmptyState
          icon="history"
          title="No analyses yet"
          subtitle="Run your first skill-gap analysis to see it here."
          action={
            <button onClick={() => navigate("/add-skills")} className="btn-primary">
              Start New Analysis
            </button>
          }
        />
      ) : (
        <>
          <div className="relative max-w-sm">
            <span className="ms pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-soft">
              search
            </span>
            <input
              className="input pl-10"
              placeholder="Filter by role name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-card">
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-ink-soft">No analyses match "{query}".</p>
            ) : (
              rows.map((r, i) => {
                const c = statusColor(r.match_percent);
                return (
                  <div
                    key={r.match_result_id}
                    className={`flex flex-wrap items-center gap-4 px-6 py-4 ${
                      i % 2 ? "bg-surface-page/50" : ""
                    }`}
                  >
                    <div className="w-28 text-sm text-ink-soft">{formatDate(r.created_at)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold capitalize text-ink">
                        {titleCase(r.target_role)}
                      </p>
                      <p className="text-xs text-ink-soft">{r.missing_skills_count} skills to close</p>
                    </div>
                    <span className={`pill ${c.soft} ${c.text}`}>{Math.round(r.match_percent)}% match</span>
                    <div className="flex items-center gap-1">
                      <IconBtn icon="visibility" title="View" onClick={() => navigate(`/results/${r.match_result_id}`)} />
                      <IconBtn
                        icon="download"
                        title="Download report"
                        onClick={() =>
                          setReport({
                            matchResultId: r.match_result_id,
                            role: r.target_role,
                            matchPercent: r.match_percent,
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

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

function IconBtn({ icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-page hover:text-primary"
    >
      <span className="ms text-[20px]">{icon}</span>
    </button>
  );
}
