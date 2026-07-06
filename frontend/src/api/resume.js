import { api } from "./client";

// Upload a PDF resume (multipart). Returns { resume_id, extracted_skills, skill_count }.
export const uploadResumePdf = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post("/resume/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

// Submit manually-entered skills / pasted text. Backend re-extracts against the vocab.
export const uploadResumeText = (resumeText) =>
  api.post("/resume/upload-text", { resume_text: resumeText }).then((r) => r.data);

// Live skill autocomplete for manual entry. Returns { skills, total_available }.
export const searchSkills = (q, limit = 8) =>
  api.get("/resume/skills", { params: { q, limit } }).then((r) => r.data.skills);
