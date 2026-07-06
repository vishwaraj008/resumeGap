import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFlow } from "../context/FlowContext";

export default function Profile() {
  const { email, logout } = useAuth();
  const { setResume } = useFlow();
  const navigate = useNavigate();

  const handleLogout = () => {
    setResume(null);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Profile</h1>

      <div className="card space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
            {(email || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-ink">{email}</p>
            <p className="text-sm text-ink-soft">SkillPath member</p>
          </div>
        </div>

        <div className="border-t border-line pt-5">
          <button onClick={handleLogout} className="btn-secondary !border-danger/50 !text-danger hover:!bg-danger/10">
            <span className="ms text-[20px]">logout</span>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
