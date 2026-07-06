import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server runs on port 3000 to match the backend's default CORS origin
// (FRONTEND_URL=http://localhost:3000 in backend/.env).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
});
