export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
        <span className="ms text-[24px]">trending_up</span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-lg font-bold text-ink">SkillPath</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Career Growth
          </p>
        </div>
      )}
    </div>
  );
}
