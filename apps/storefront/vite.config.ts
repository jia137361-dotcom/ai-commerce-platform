import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react()],
  server: {
    proxy: {
      "/auth": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
      },
      "/store": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
      },
    },
  },
})
