import { titleCase } from "../lib/format";

// variant: "matched" | "missing" | "learning" | "neutral"
const VARIANTS = {
  matched: "bg-success/10 text-success",
  missing: "bg-danger/10 text-danger",
  learning: "bg-warning/10 text-warning",
  neutral: "bg-primary-light text-primary",
};

export default function SkillPill({ label, variant = "neutral", onRemove }) {
  return (
    <span className={`pill ${VARIANTS[variant]}`}>
      {titleCase(label)}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 opacity-70 transition hover:opacity-100"
          aria-label={`Remove ${label}`}
        >
          <span className="ms text-[14px]">close</span>
        </button>
      )}
    </span>
  );
}
