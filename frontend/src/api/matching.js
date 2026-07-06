import { api } from "./client";

// Live role autocomplete. Returns { roles, total_available }.
export const searchRoles = (q, limit = 8) =>
  api.get("/matching/roles", { params: { q, limit } }).then((r) => r.data.roles);

// Single-role analysis.
export const analyzeRole = (resumeId, targetRole) =>
  api
    .post("/matching/analyze", { resume_id: resumeId, target_role: targetRole })
    .then((r) => r.data);

// Multi-role comparison (2-3 roles).
export const compareRoles = (resumeId, targetRoles) =>
  api
    .post("/matching/compare", { resume_id: resumeId, target_roles: targetRoles })
    .then((r) => r.data);
