import { NavLink } from "react-router-dom";
import Logo from "../Logo";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/add-skills", label: "New Analysis", icon: "add_circle" },
  { to: "/history", label: "History", icon: "history" },
  { to: "/compare", label: "Compare Roles", icon: "compare_arrows" },
  { to: "/profile", label: "Profile", icon: "account_circle" },
];

export default function Sidebar({ onNavigate }) {
  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-line bg-white">
      <div className="px-6 py-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-ink-soft hover:bg-surface-page hover:text-ink"
              }`
            }
          >
            <span className="ms text-[22px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4">
        <NavLink to="/add-skills" onClick={onNavigate} className="btn-primary w-full">
          <span className="ms text-[20px]">bolt</span>
          Start New Path
        </NavLink>
      </div>
    </aside>
  );
}
