// Step 1 of 3 progress header used across the analysis flow.
const STEPS = ["Add Your Skills", "Choose Target Role", "See Results"];

export default function StepIndicator({ current = 1 }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                  active
                    ? "bg-primary text-white"
                    : done
                    ? "bg-success text-white"
                    : "bg-surface-dim text-ink-soft"
                }`}
              >
                {done ? <span className="ms text-[18px]">check</span> : step}
              </div>
              <span
                className={`text-sm font-semibold ${
                  active ? "text-ink" : "text-ink-soft"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="ms hidden text-[18px] text-ink-soft sm:block">chevron_right</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
