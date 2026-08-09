import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

/** Browser navigations (Accept: text/html) must hit the SPA, not Medusa. */
const spaBypass = (req: { headers: { accept?: string } }) => {
  if (req.headers.accept?.includes("text/html")) {
    return "/index.html"
  }
}

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react()],
  server: {
    allowedHosts: [
      "virgin-boundary-adapters-loaded.trycloudflare.com",
    ],
    proxy: {
      "/auth": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
        bypass: spaBypass,
      },
      "/store": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
        bypass: spaBypass,
      },
      "/admin": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
        bypass: spaBypass,
      },
    },
  },
})
