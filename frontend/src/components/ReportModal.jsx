import { useState } from "react";
import Modal from "./Modal";
import { Spinner } from "./states";
import { downloadReport } from "../api/report";
import { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { titleCase } from "../lib/format";

// Report preview + download modal. Works for any match_result_id.
export default function ReportModal({ open, onClose, matchResultId, role, matchPercent }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setBusy(true);
    setError("");
    try {
      const safe = (role || "report").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      await downloadReport(matchResultId, `skillpath_${safe}.pdf`);
      toast.success("Report downloaded successfully");
      onClose();
    } catch (err) {
      setError(apiError(err, "Failed to generate the report."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Your Personalized Report"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={busy}>
            Cancel
          </button>
          <button onClick={handleDownload} className="btn-primary" disabled={busy}>
            {busy ? (
              <>
                <Spinner className="h-4 w-4 border-white/40 border-t-white" />
                Generating...
              </>
            ) : (
              <>
                <span className="ms text-[20px]">download</span>
                Download PDF
              </>
            )}
          </button>
        </>
      }
    >
      {/* Mini document preview */}
      <div className="mb-5 rounded-xl border border-line bg-surface-page p-5">
        <p className="text-sm font-bold text-ink">{titleCase(role || "")} — Skill Gap Report</p>
        {matchPercent != null && (
          <p className="mt-1 text-xs text-ink-soft">Overall match: {Math.round(matchPercent)}%</p>
        )}
        <div className="mt-4 space-y-2">
          <div className="h-2 w-3/4 rounded bg-surface-dim" />
          <div className="h-2 w-full rounded bg-surface-dim" />
          <div className="h-2 w-5/6 rounded bg-surface-dim" />
        </div>
      </div>

      <p className="mb-2 text-sm font-semibold text-ink">Your report includes:</p>
      <ul className="space-y-1.5 text-sm text-ink-soft">
        {["Match summary", "Skill gap table", "Learning roadmap (free + paid)", "Career trajectory"].map(
          (item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="ms text-[18px] text-success">check_circle</span>
              {item}
            </li>
          )
        )}
      </ul>

      {error && (
        <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-danger">
          <span className="ms text-[18px]">error</span>
          {error}
        </p>
      )}
    </Modal>
  );
}
