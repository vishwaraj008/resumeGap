import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-page p-6 text-center">
      <span className="ms text-[64px] text-primary">explore_off</span>
      <h1 className="text-3xl font-bold text-ink">Page not found</h1>
      <p className="text-ink-soft">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
