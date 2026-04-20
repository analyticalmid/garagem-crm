import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@hello-pangea/dnd")) {
            return "dnd";
          }

          if (id.includes("recharts")) {
            return "recharts";
          }

          if (id.includes("@supabase")) {
            return "supabase";
          }

          if (id.includes("@tanstack/react-query")) {
            return "react-query";
          }

          return;
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
