import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoadmap } from "../api/roadmap";
import { analyzeRole } from "../api/matching";
import { apiError } from "../api/client";
import { useFlow } from "../context/FlowContext";
import { useToast } from "../context/ToastContext";
import { LoadingBlock, ErrorBanner } from "../components/states";
import OverviewTab from "../components/results/OverviewTab";
import RoadmapTab from "../components/results/RoadmapTab";
import CareerPathTab from "../components/results/CareerPathTab";
import ReportModal from "../components/ReportModal";
import { titleCase } from "../lib/format";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "roadmap", label: "Learning Roadmap" },
  { key: "career", label: "Career Path" },
];

export default function Results() {
  const { matchResultId } = useParams();
  const navigate = useNavigate();
  const { resume, readAnalysis, cacheAnalysis } = useFlow();
  const toast = useToast();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    const cached = readAnalysis(matchResultId);
    if (cached) {
      setAnalysis(cached);
      setLoading(false);
      return;
    }

    // No cached analysis (e.g. opened from History or after a refresh):
    // reconstruct a minimal overview from the roadmap endpoint.
    getRoadmap(matchResultId, "all")
      .then((d) => {
        if (!alive) return;
        setAnalysis({
          match_result_id: Number(matchResultId),
          target_role: d.target_role,
          match_percent: d.match_percent,
          matched_skills: [],
          missing_skills: d.roadmap.map((r) => r.skill),
          alternate_suggestions: [],
        });
      })
      .catch((e) => alive && setError(apiError(e, "Couldn't load this analysis.")))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchResultId]);

  const pickAlternate = async (role) => {
    if (!resume?.resumeId) {
      navigate("/choose-role");
      return;
    }
    try {
      const data = await analyzeRole(resume.resumeId, role);
      cacheAnalysis(data.match_result_id, data);
      toast.success(`Analyzed ${titleCase(role)}`);
      navigate(`/results/${data.match_result_id}`);
    } catch (e) {
      toast.error(apiError(e, "Couldn't analyze that role."));
    }
  };

  if (loading) return <LoadingBlock label="Loading your results..." />;
  if (error) return <ErrorBanner message={error} onRetry={() => navigate("/add-skills")} />;
  if (!analysis) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
            <span className="ms text-[26px] text-primary">bar_chart</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold capitalize text-ink">{titleCase(analysis.target_role)}</h1>
            <p className="text-sm text-ink-soft">Role fit analysis</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-semibold transition ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => navigate("/compare")}
          className="-mb-px border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-ink-soft transition hover:text-ink"
        >
          Compare
        </button>
      </div>

      {tab === "overview" && (
        <OverviewTab
          analysis={analysis}
          onOpenReport={() => setReportOpen(true)}
          onPickAlternate={pickAlternate}
        />
      )}
      {tab === "roadmap" && <RoadmapTab matchResultId={matchResultId} />}
      {tab === "career" && <CareerPathTab matchResultId={matchResultId} analysis={analysis} />}

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        matchResultId={Number(matchResultId)}
        role={analysis.target_role}
        matchPercent={analysis.match_percent}
      />
    </div>
  );
}
