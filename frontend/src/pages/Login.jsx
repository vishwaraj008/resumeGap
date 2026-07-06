import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { loginUser, registerUser } from "../api/auth";
import { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import { Spinner } from "../components/states";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!emailValid) return setError("Please enter a valid email");
    if (password.length < 6) return setError("Password must be at least 6 characters");

    setLoading(true);
    try {
      const fn = mode === "login" ? loginUser : registerUser;
      const data = await fn(email, password);
      login(data.access_token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiError(err, "Authentication failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary to-[#7c3aed] p-12 text-white lg:flex">
        <Logo compact={false} />
        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight">
            Know exactly what stands between you and your next role.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Upload your resume, pick a target role, and get a personalized roadmap to
            close your skill gap — backed by real job-market data.
          </p>
          <ul className="mt-8 space-y-3">
            {["Weighted skill-gap analysis", "Sequenced learning roadmap", "Downloadable PDF report"].map(
              (f) => (
                <li key={f} className="flex items-center gap-3 text-white/90">
                  <span className="ms text-[22px]">check_circle</span>
                  {f}
                </li>
              )
            )}
          </ul>
        </div>
        <p className="text-sm text-white/60">Data-backed career coaching.</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-surface-page p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="card">
            <div className="mb-6 grid grid-cols-2 rounded-full bg-surface-page p-1">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError("");
                  }}
                  className={`rounded-full py-2.5 text-sm font-semibold transition ${
                    mode === m ? "bg-white text-primary shadow-sm" : "text-ink-soft"
                  }`}
                >
                  {m === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className="input pr-11"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft transition hover:text-ink"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    <span className="ms text-[20px]">{showPw ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-danger">
                  <span className="ms text-[18px]">error</span>
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : null}
                {mode === "login" ? "Continue" : "Create account"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-soft">
              {mode === "login" ? "New to SkillPath? " : "Already have an account? "}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                }}
                className="font-semibold text-primary hover:underline"
              >
                {mode === "login" ? "Create one" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
