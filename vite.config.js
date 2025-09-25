import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

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
        "user-home": resolve(__dirname, "User/home.html"),
        "user-report": resolve(__dirname, "User/report.html"),
        "user-shop": resolve(__dirname, "User/shop.html"),
        "user-profile": resolve(__dirname, "User/profile.html"),
        "user-camera": resolve(__dirname, "User/camera.html"),
        "admin-dashboard": resolve(__dirname, "Admin/dashboard.html"),
        "admin-reports": resolve(__dirname, "Admin/reports.html"),
        "admin-analytics": resolve(__dirname, "Admin/analytics.html"),
        "admin-export": resolve(__dirname, "Admin/export.html")
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "assets",
          dest: "." // copy as dist/assets/*
        }
      ]
    })
  ]
});
