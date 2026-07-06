import { useAuth } from "../../context/AuthContext";

export default function TopBar({ onMenu, breadcrumb }) {
  const { email } = useAuth();
  const initial = (email || "?").charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-line bg-white/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="text-ink-soft transition hover:text-ink lg:hidden"
          aria-label="Open menu"
        >
          <span className="ms text-[24px]">menu</span>
        </button>
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumb?.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="ms text-[16px] text-ink-soft">chevron_right</span>}
              <span className={i === breadcrumb.length - 1 ? "font-bold text-ink" : "text-ink-soft"}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative text-ink-soft transition hover:text-ink" aria-label="Notifications">
          <span className="ms text-[24px]">notifications</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {initial}
          </div>
          <span className="hidden text-sm font-medium text-ink sm:block">{email}</span>
        </div>
      </div>
    </header>
  );
}
