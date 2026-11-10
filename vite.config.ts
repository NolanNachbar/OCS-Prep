import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { execSync } from "child_process"
import { defineConfig } from "vite"

const build = (() => { try { return execSync("git rev-parse --short HEAD").toString().trim() } catch { return "dev" } })()

// base "./" so the build works from a GitHub Pages sub-path
export default defineConfig({
  base: "./",
  define: { __BUILD__: JSON.stringify(build) },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
})
