import { api } from "./client";

export const getHistory = () => api.get("/history/").then((r) => r.data);
