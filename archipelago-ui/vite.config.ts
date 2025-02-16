import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from "path"
import { defineConfig } from "vite"

const isDev = process.env.npm_lifecycle_event === "build:watch"

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        TanStackRouterVite({ autoCodeSplitting: true }),
        react(),
        tailwindcss()
    ],
    base: "./",
    build: {
        outDir: isDev ? "../components/archipelago/webui" : "dist/archipelago",
    },
    // Alias paths
    resolve: {
        alias: {
            "~": path.resolve(__dirname, "./src"),
        },
    },
})
