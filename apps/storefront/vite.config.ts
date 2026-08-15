import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dotenv from "dotenv"
import path from "node:path"

dotenv.config({ path: path.resolve(__dirname, "../medusa-backend/.env") })
dotenv.config({ path: path.resolve(__dirname, ".env") })
dotenv.config({ path: path.resolve(__dirname, ".env.local") })
/** Browser navigations (Accept: text/html) must hit the SPA, not Medusa. */
const spaBypass = (req: { headers: { accept?: string } }) => {
  if (req.headers.accept?.includes("text/html")) {
    return "/index.html"
  }
}

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  define: {
    // Keep Google auth flag readable without import.meta (Jest-friendly).
    "process.env.VITE_GOOGLE_AUTH_ENABLED": JSON.stringify(process.env.VITE_GOOGLE_AUTH_ENABLED ?? ""),
  },
  plugins: [react()],
  server: {
    // Cloudflare Quick Tunnels provide an HTTPS origin for wallet testing.
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/auth": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
        bypass: spaBypass,
      },
      "/store": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
        bypass: spaBypass,
      },
      "/admin": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
        bypass: spaBypass,
      },
      "/static": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
      },
    },
  },
})
