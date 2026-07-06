import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadResumePdf, uploadResumeText, searchSkills } from "../api/resume";
import { apiError } from "../api/client";
import { useFlow } from "../context/FlowContext";
import { useToast } from "../context/ToastContext";
import StepIndicator from "../components/StepIndicator";
import Autocomplete from "../components/Autocomplete";
import SkillPill from "../components/SkillPill";
import { Spinner } from "../components/states";

export default function AddSkills() {
  const navigate = useNavigate();
  const { setResume } = useFlow();
  const toast = useToast();

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [manualSkills, setManualSkills] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const pickFile = (f) => {
    setError("");
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const addManualSkill = (skill) => {
    const s = skill.trim().toLowerCase();
    if (s && !manualSkills.includes(s)) setManualSkills((prev) => [...prev, s]);
  };
  const removeManualSkill = (skill) =>
    setManualSkills((prev) => prev.filter((s) => s !== skill));

  const proceed = (result) => {
    if (!result.skill_count) {
      setError(
        "We couldn't detect any known skills. Try a different resume or add skills manually."
      );
      return;
    }
    setResume({ resumeId: result.resume_id, skills: result.extracted_skills });
    toast.success(`Extracted ${result.skill_count} skills`);
    navigate("/choose-role");
  };

  const submitPdf = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const result = await uploadResumePdf(file);
      proceed(result);
    } catch (err) {
      setError(apiError(err, "Failed to process the resume."));
    } finally {
      setBusy(false);
    }
  };

  const submitManual = async () => {
    if (manualSkills.length === 0) return;
    setBusy(true);
    setError("");
    try {
      // Backend re-extracts from text; joining known skills guarantees they're recognized.
      const result = await uploadResumeText(manualSkills.join(". "));
      proceed(result);
    } catch (err) {
      setError(apiError(err, "Failed to save your skills."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <StepIndicator current={1} />

      <div>
        <h1 className="text-2xl font-bold text-ink">Start Your Analysis</h1>
        <p className="mt-1 text-ink-soft">How would you like to add your skills?</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger/10 p-4 text-sm font-medium text-danger ring-1 ring-danger/20">
          <span className="ms text-[20px]">error</span>
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card A — Upload Resume */}
        <div className="card flex flex-col">
          <div className="mb-4 flex items-center gap-3">
            <span className="ms text-[24px] text-primary">upload_file</span>
            <h2 className="text-lg font-bold text-ink">Upload Resume</h2>
          </div>

          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition ${
                dragOver ? "border-primary bg-primary-light" : "border-line hover:border-primary/50"
              }`}
            >
              <span className="ms text-[40px] text-primary">picture_as_pdf</span>
              <p className="font-semibold text-ink">Drag &amp; drop your resume PDF</p>
              <p className="text-sm text-ink-soft">or click to browse</p>
              <p className="mt-2 text-xs text-ink-soft">We'll extract your skills automatically.</p>
            </button>
          ) : (
            <div className="flex flex-1 flex-col justify-between">
              <div className="flex items-center gap-3 rounded-xl bg-surface-page p-4">
                <span className="ms text-[28px] text-danger">picture_as_pdf</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                  <p className="text-xs text-ink-soft">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <span className="ms text-[22px] text-success">check_circle</span>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm font-semibold text-ink-soft hover:text-danger"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          <button onClick={submitPdf} disabled={!file || busy} className="btn-primary mt-5">
            {busy && file ? (
              <>
                <Spinner className="h-4 w-4 border-white/40 border-t-white" />
                Extracting skills...
              </>
            ) : (
              <>
                Continue
                <span className="ms text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>

        {/* Card B — Enter Skills Manually */}
        <div className="card flex flex-col">
          <div className="mb-4 flex items-center gap-3">
            <span className="ms text-[24px] text-primary">edit</span>
            <h2 className="text-lg font-bold text-ink">Enter Skills Manually</h2>
          </div>

          <Autocomplete
            fetcher={searchSkills}
            onSelect={addManualSkill}
            placeholder="Type a skill (e.g. Python, SQL, Excel)"
            icon="search"
            excluded={manualSkills}
            clearOnSelect
          />

          <div className="mt-4 flex flex-1 flex-wrap content-start gap-2">
            {manualSkills.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Search and select skills — suggestions come from our skills database.
              </p>
            ) : (
              manualSkills.map((s) => (
                <SkillPill
                  key={s}
                  label={s}
                  variant="neutral"
                  onRemove={() => removeManualSkill(s)}
                />
              ))
            )}
          </div>

          <button
            onClick={submitManual}
            disabled={manualSkills.length === 0 || busy}
            className="btn-primary mt-5"
          >
            {busy && !file ? (
              <Spinner className="h-4 w-4 border-white/40 border-t-white" />
            ) : null}
            Continue
            <span className="ms text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
