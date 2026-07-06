import { createContext, useContext, useMemo, useState } from "react";

// Carries state across the multi-step analysis flow
// (Add Skills -> Choose Role -> Results) and survives refresh via sessionStorage.
const FlowContext = createContext(null);

const RESUME_KEY = "skillpath_resume";

function readResume() {
  try {
    return JSON.parse(sessionStorage.getItem(RESUME_KEY)) || null;
  } catch {
    return null;
  }
}

export function FlowProvider({ children }) {
  const [resume, setResumeState] = useState(readResume);

  const setResume = (data) => {
    // data: { resumeId, skills: [...] }
    setResumeState(data);
    if (data) sessionStorage.setItem(RESUME_KEY, JSON.stringify(data));
    else sessionStorage.removeItem(RESUME_KEY);
  };

  // Cache an analyze response so the Results page survives a refresh
  // (there is no GET-analyze endpoint to re-fetch it from).
  const cacheAnalysis = (matchResultId, data) => {
    if (matchResultId == null) return;
    sessionStorage.setItem(`skillpath_analysis_${matchResultId}`, JSON.stringify(data));
  };
  const readAnalysis = (matchResultId) => {
    try {
      return JSON.parse(sessionStorage.getItem(`skillpath_analysis_${matchResultId}`)) || null;
    } catch {
      return null;
    }
  };

  const value = useMemo(
    () => ({ resume, setResume, cacheAnalysis, readAnalysis }),
    [resume]
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used within FlowProvider");
  return ctx;
}
