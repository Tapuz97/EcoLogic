import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets", // put vite-generated files under /assets
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        terms: resolve(__dirname, "terms.html"),
        privacy: resolve(__dirname, "privacy.html"),
        notfound: resolve(__dirname, "404.html"),
        "user-home": resolve(__dirname, "User/home.html"),
        "user-report": resolve(__dirname, "User/report.html"),
        "user-shop": resolve(__dirname, "User/shop.html"),
        "user-profile": resolve(__dirname, "User/profile.html"),
        "user-camera": resolve(__dirname, "User/camera.html"),
        "admin-dashboard": resolve(__dirname, "Admin/dashboard.html"),
        "admin-reports": resolve(__dirname, "Admin/reports.html"),
        "admin-analytics": resolve(__dirname, "Admin/analytics.html"),
        "admin-export": resolve(__dirname, "Admin/export.html")
      },
      output: {
        // Force ALL emitted files into /assets
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: ({ name }) => {
          // keep existing subfolders if possible (css, icons, logos, Fonts, etc.)
          if (!name) return "assets/[name]-[hash][extname]";
          const seg = name
            .replace(/\\/g, "/")
            .split("/")
            .slice(-2, -1)[0]; // parent folder name
          // If parent folder looks like a known asset dir, preserve it
          if (/(css|js|icons|logos|Fonts|rewards)/i.test(seg)) {
            return `assets/${seg}/[name]-[hash][extname]`;
          }
          return "assets/[name]-[hash][extname]";
        }
      }
    }
  },
  plugins: [
    // Copy your raw /assets tree as-is (icons, logos, fonts, etc.)
    // so any files not processed by Vite still exist in dist/assets.
    viteStaticCopy({
      targets: [{ src: "assets", dest: "." }]
    })
  ]
});
