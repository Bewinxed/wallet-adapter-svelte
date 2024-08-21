import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
export default defineConfig({
    plugins: [svelte()],
    build: {
        lib: {
            name: "@bewinxed/wallet-adapter-svelte",
            entry: "src/lib/index.ts",
            fileName: "index",
        },
    },
});
