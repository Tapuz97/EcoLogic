import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  root: ".",
  base: "/",
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
      },
      output: {
        // Maintain directory structure
        entryFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId) {
            // Check if this is a User or Admin page
            if (facadeModuleId.includes('User/')) {
              return 'User/[name]-[hash].js';
            }
            if (facadeModuleId.includes('Admin/')) {
              return 'Admin/[name]-[hash].js';
            }
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name;
          if (!name) return 'assets/[name]-[hash][extname]';
          
          // Preserve asset folder structure
          if (name.includes('css')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          if (name.includes('js')) {
            return 'assets/js/[name]-[hash][extname]';
          }
          if (name.includes('fonts') || name.includes('Fonts')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          if (name.includes('icons')) {
            return 'assets/icons/[name]-[hash][extname]';
          }
          if (name.includes('logos')) {
            return 'assets/logos/[name]-[hash][extname]';
          }
          if (name.includes('rewards')) {
            return 'assets/rewards/[name]-[hash][extname]';
          }
          
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  plugins: [
    // Copy assets folder to maintain structure
    viteStaticCopy({
      targets: [
        {
          src: "assets/**/*",
          dest: "assets"
        },
        {
          src: "./ThemeToggle.js",
          dest: ""
        }
      ]
    })
  ],
  // Prevent Vite from processing these scripts
  assetsInclude: ['**/*.js']
});
