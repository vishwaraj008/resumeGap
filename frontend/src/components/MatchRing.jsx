import { statusColor } from "../lib/format";

// Radial progress ring for match %. Pure SVG (no chart lib needed for a single arc).
export default function MatchRing({ percent = 0, size = 180, stroke = 16, label }) {
  const value = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = statusColor(value).hex;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-ink">
          {Math.round(value)}
          <span className="text-xl text-ink-soft">%</span>
        </span>
        {label && <span className="mt-0.5 text-xs font-medium text-ink-soft">{label}</span>}
      </div>
    </div>
  );
}
