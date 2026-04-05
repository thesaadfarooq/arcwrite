import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "api/**/*.ts"],
      exclude: [
        "src/components/ui/**",
        "src/components/story/BranchGraph.tsx",
        "src/integrations/supabase/types.ts",
        "src/integrations/supabase/client.ts",
        "src/hooks/use-toast.ts",
        "src/main.tsx",
        "src/test/**",
        "src/vite-env.d.ts",
        "e2e/**",
      ],
      thresholds: {
        statements: 85,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
