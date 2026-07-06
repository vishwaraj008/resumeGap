import { api } from "./client";

// resourceType: "all" | "free" | "paid"
export const getRoadmap = (matchResultId, resourceType = "all") =>
  api
    .get(`/roadmap/${matchResultId}`, { params: { resource_type: resourceType } })
    .then((r) => r.data);
