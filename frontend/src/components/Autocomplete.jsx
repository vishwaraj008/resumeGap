import { useEffect, useRef, useState } from "react";
import { Spinner } from "./states";

/**
 * Debounced async autocomplete. All suggestions come from the backend — nothing hardcoded.
 *
 * props:
 *  - fetcher: async (query) => string[]
 *  - onSelect: (value) => void
 *  - placeholder, icon
 *  - excluded: string[] of already-chosen values to hide
 *  - clearOnSelect: reset the input after selecting (for tag inputs)
 */
export default function Autocomplete({
  fetcher,
  onSelect,
  placeholder = "Search...",
  icon = "search",
  excluded = [],
  clearOnSelect = false,
  autoFocus = false,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const onClickAway = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetcher(q);
        const excludedLower = excluded.map((e) => e.toLowerCase());
        setResults(data.filter((r) => !excludedLower.includes(r.toLowerCase())));
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const choose = (value) => {
    onSelect(value);
    if (clearOnSelect) setQuery("");
    setOpen(false);
    setResults([]);
  };

  const onKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      choose(results[activeIndex]);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <span className="ms pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-soft">
          {icon}
        </span>
        <input
          className="input pl-10"
          placeholder={placeholder}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner />
          </span>
        )}
      </div>

      {open && (results.length > 0 || (!loading && query.trim())) && (
        <ul className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl bg-white py-1 shadow-modal ring-1 ring-line">
          {results.length === 0 && !loading ? (
            <li className="px-4 py-3 text-sm text-ink-soft">No matches found</li>
          ) : (
            results.map((r, i) => (
              <li key={r}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(r)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm capitalize transition ${
                    i === activeIndex ? "bg-primary-light text-primary" : "text-ink hover:bg-surface-page"
                  }`}
                >
                  <span className="ms text-[18px] text-ink-soft">add</span>
                  {r}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
