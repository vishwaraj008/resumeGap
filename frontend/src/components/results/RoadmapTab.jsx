import { useEffect, useState } from "react";
import { getRoadmap } from "../../api/roadmap";
import { apiError } from "../../api/client";
import { LoadingBlock, ErrorBanner } from "../states";
import { titleCase, hoursToHuman } from "../../lib/format";

// Prettify a course duration: ISO-8601 (PT6H14M7S) -> "6h 14m", else pass through.
function formatDuration(d) {
  if (!d) return null;
  const iso = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(d);
  if (iso) {
    const [, h, m] = iso;
    return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ") || "video";
  }
  return d;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "paid", label: "Paid" },
];

export default function RoadmapTab({ matchResultId }) {
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    getRoadmap(matchResultId, filter)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(apiError(e, "Failed to load the roadmap.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [matchResultId, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="card flex items-center gap-4 !py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light">
            <span className="ms text-[24px] text-primary">schedule</span>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-soft">Estimated time to close your gap</p>
            <p className="text-xl font-bold text-ink">
              {data ? hoursToHuman(data.total_estimated_hours) : "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 rounded-full bg-white p-1 shadow-card">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                filter === f.key ? "bg-primary text-white" : "text-ink-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Building your roadmap..." />
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => setFilter((f) => f)} />
      ) : data.roadmap.length === 0 ? (
        <div className="card text-center text-sm text-ink-soft">
          No missing skills — you're a strong match for this role!
        </div>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-line pl-8">
          {data.roadmap.map((item) => (
            <li key={item.sequence_order} className="relative">
              <span className="absolute -left-[41px] flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {item.sequence_order}
              </span>
              <div className="card">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold capitalize text-ink">{titleCase(item.skill)}</h3>
                  <span className="pill bg-primary-light text-primary">
                    ~{hoursToHuman(item.estimated_duration_hours)}
                  </span>
                </div>

                {item.course_recommendations.length === 0 ? (
                  <p className="text-sm text-ink-soft">
                    No {filter !== "all" ? filter : ""} resources found for this skill.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {item.course_recommendations.map((course, ci) => (
                      <a
                        key={ci}
                        href={course.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-primary/40 hover:bg-surface-page"
                      >
                        <span className="ms text-[22px] text-ink-soft">
                          {course.is_free ? "smart_display" : "school"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {course.title || "Untitled course"}
                          </p>
                          <p className="truncate text-xs text-ink-soft">
                            {course.platform}
                            {course.channel ? ` · ${course.channel}` : ""}
                            {formatDuration(course.duration) ? ` · ${formatDuration(course.duration)}` : ""}
                          </p>
                        </div>
                        <span
                          className={`pill ${
                            course.is_free ? "bg-success/10 text-success" : "bg-surface-dim text-ink-soft"
                          }`}
                        >
                          {course.is_free ? "Free" : "Paid"}
                        </span>
                        <span className="ms text-[18px] text-ink-soft">open_in_new</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
