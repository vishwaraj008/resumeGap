import { api } from "./client";

export const registerUser = (email, password) =>
  api.post("/auth/register", { email, password }).then((r) => r.data);

export const loginUser = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);
