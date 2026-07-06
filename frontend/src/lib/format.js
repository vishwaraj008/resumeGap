// Maps a match/importance percentage (0-100) to a semantic status.
export function matchStatus(percent) {
  if (percent >= 75) return "strong"; // emerald
  if (percent >= 50) return "partial"; // amber
  return "weak"; // rose
}

export const STATUS_COLOR = {
  strong: { text: "text-success", bg: "bg-success", soft: "bg-success/10", hex: "#10B981" },
  partial: { text: "text-warning", bg: "bg-warning", soft: "bg-warning/10", hex: "#F59E0B" },
  weak: { text: "text-danger", bg: "bg-danger", soft: "bg-danger/10", hex: "#EF4444" },
};

export function statusColor(percent) {
  return STATUS_COLOR[matchStatus(percent)];
}

// Turn a raw skill string into Title Case for display (backend stores lowercase).
export function titleCase(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map((w) => (w.length > 3 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// "6h" or "1w 2d" style compact hours -> human string.
export function hoursToHuman(hours) {
  if (!hours || hours <= 0) return "—";
  if (hours < 40) return `${Math.round(hours)} hrs`;
  const weeks = hours / 40; // ~1 work-week of study
  if (weeks < 4) return `${weeks.toFixed(1)} weeks`;
  return `${(weeks / 4).toFixed(1)} months`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
