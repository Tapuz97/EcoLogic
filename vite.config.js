import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        terms: resolve(__dirname, "terms.html"),
        privacy: resolve(__dirname, "privacy.html"),
        notfound: resolve(__dirname, "404.html"),
        "user-home": resolve(__dirname, "user/home.html"),
        "user-report": resolve(__dirname, "user/report.html"),
        "user-shop": resolve(__dirname, "user/shop.html"),
        "user-profile": resolve(__dirname, "user/profile.html"),
        "user-camera": resolve(__dirname, "user/camera.html"),
        "admin-dashboard": resolve(__dirname, "admin/dashboard.html"),
        "admin-reports": resolve(__dirname, "admin/reports.html"),
        "admin-analytics": resolve(__dirname, "admin/analytics.html"),
        "admin-export": resolve(__dirname, "admin/export.html")
      }
    }
  }
});
