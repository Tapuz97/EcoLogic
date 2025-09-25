// vite.config.js
import { defineConfig } from "vite";
export default defineConfig({
  root: ".",      // project root with your html files
  base: "./",     // relative assets for multi-page static site
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        // list your entry html files (multi-page)
        index: "index.html",
        login: "login.html",
        terms: "terms.html",
        privacy: "privacy.html",
        // user
        user_home: "user/home.html",
        user_report: "user/report.html",
        user_shop: "user/shop.html",
        user_profile: "user/profile.html",
        // admin
        admin_dashboard: "admin/dashboard.html",
        admin_reports: "admin/reports.html",
        admin_analytics: "admin/analytics.html",
        admin_export: "admin/export.html",
        // camera (if you still use it)
        camera: "user/camera.html"
      }
    }
  }
});
