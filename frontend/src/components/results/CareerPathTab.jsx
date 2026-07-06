import { useEffect, useState } from "react";
import { getRoadmap } from "../../api/roadmap";
import { apiError } from "../../api/client";
import { LoadingBlock, ErrorBanner } from "../states";
import TrajectoryGraph from "../TrajectoryGraph";
import SkillPill from "../SkillPill";
import { titleCase } from "../../lib/format";

export default function CareerPathTab({ matchResultId, analysis }) {
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getRoadmap(matchResultId, "all")
      .then((d) => alive && setGraph(d.trajectory_graph))
      .catch((e) => alive && setError(apiError(e, "Failed to load the career path.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [matchResultId]);

  const missing = analysis?.missing_skills || [];

  if (loading) return <LoadingBlock label="Mapping your career path..." />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-1 text-xl font-bold text-ink">Career Trajectory</h2>
        <p className="mb-6 text-sm text-ink-soft">
          A typical progression path for the{" "}
          <span className="font-semibold capitalize">{titleCase(analysis?.target_role || "")}</span> track.
        </p>
        <TrajectoryGraph graph={graph} />
      </div>

      <div className="card">
        <h3 className="mb-1 font-bold text-ink">Skills to unlock your next stage</h3>
        <p className="mb-4 text-sm text-ink-soft">
          Close these gaps to strengthen your fit and progress along the path.
        </p>
        {missing.length === 0 ? (
          <p className="text-sm text-ink-soft">No missing skills — you're ready to level up!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {missing.map((s) => (
              <SkillPill key={s} label={s} variant="missing" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
