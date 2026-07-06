import { api } from "./client";

// Requests the PDF report and triggers a browser download.
export const downloadReport = async (matchResultId, filename = "skill_gap_report.pdf") => {
  const res = await api.post(
    "/report/generate",
    { match_result_id: matchResultId },
    { responseType: "blob" }
  );
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
