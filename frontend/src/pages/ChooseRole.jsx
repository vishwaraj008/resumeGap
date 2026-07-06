import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeRole, compareRoles, searchRoles } from "../api/matching";
import { apiError } from "../api/client";
import { useFlow } from "../context/FlowContext";
import { useToast } from "../context/ToastContext";
import StepIndicator from "../components/StepIndicator";
import Autocomplete from "../components/Autocomplete";
import SkillPill from "../components/SkillPill";
import { Spinner } from "../components/states";

export default function ChooseRole() {
  const navigate = useNavigate();
  const { resume, cacheAnalysis } = useFlow();
  const toast = useToast();

  const [mode, setMode] = useState("single"); // "single" | "compare"
  const [roles, setRoles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // No resume in the flow — send the user back to step 1.
  useEffect(() => {
    if (!resume?.resumeId) navigate("/add-skills", { replace: true });
  }, [resume, navigate]);

  const maxRoles = mode === "single" ? 1 : 3;

  const addRole = (role) => {
    if (roles.includes(role)) return;
    if (mode === "single") setRoles([role]);
    else if (roles.length < 3) setRoles((prev) => [...prev, role]);
  };
  const removeRole = (role) => setRoles((prev) => prev.filter((r) => r !== role));

  const switchMode = (m) => {
    setMode(m);
    setError("");
    if (m === "single" && roles.length > 1) setRoles(roles.slice(0, 1));
  };

  const canSubmit =
    mode === "single" ? roles.length === 1 : roles.length >= 2 && roles.length <= 3;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "single") {
        const data = await analyzeRole(resume.resumeId, roles[0]);
        cacheAnalysis(data.match_result_id, data);
        navigate(`/results/${data.match_result_id}`);
      } else {
        const data = await compareRoles(resume.resumeId, roles);
        // Persist so the Compare page survives a refresh.
        sessionStorage.setItem(
          `skillpath_compare_${resume.resumeId}`,
          JSON.stringify(data)
        );
        navigate("/compare", { state: { data } });
      }
    } catch (err) {
      setError(apiError(err, "Analysis failed. Try a different role."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <StepIndicator current={2} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Choose Your Target Role</h1>
          <p className="mt-1 text-ink-soft">
            {mode === "single"
              ? "Pick the role you want to analyze your fit against."
              : `Select 2–3 roles to compare side by side (${roles.length} of 3 selected).`}
          </p>
        </div>

        {/* Single / Compare segmented control */}
        <div className="grid grid-cols-2 rounded-full bg-white p-1 shadow-card">
          {[
            { key: "single", label: "Single Role" },
            { key: "compare", label: "Compare up to 3" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => switchMode(opt.key)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                mode === opt.key ? "bg-primary text-white" : "text-ink-soft"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">
            Search job roles
          </label>
          <Autocomplete
            fetcher={searchRoles}
            onSelect={addRole}
            placeholder="e.g. Data Analyst, ML Engineer, Backend Developer"
            icon="work"
            excluded={roles}
            clearOnSelect
            autoFocus
          />
          <p className="mt-2 text-xs text-ink-soft">
            Suggestions are pulled live from the job database as you type.
          </p>
        </div>

        {roles.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              {mode === "single" ? "Selected role" : "Selected roles"}
            </p>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 text-sm font-semibold capitalize text-primary"
                >
                  {r}
                  <button onClick={() => removeRole(r)} aria-label={`Remove ${r}`}>
                    <span className="ms text-[16px]">close</span>
                  </button>
                </span>
              ))}
            </div>
            {mode === "compare" && roles.length < 2 && (
              <p className="mt-2 text-xs text-warning">Add at least one more role to compare.</p>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-danger/10 p-4 text-sm font-medium text-danger ring-1 ring-danger/20">
            <span className="ms text-[20px]">error</span>
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={submit} disabled={!canSubmit || busy} className="btn-primary">
          {busy ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : null}
          {mode === "single" ? "Analyze My Fit" : "Compare Roles"}
          <span className="ms text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
