// AdminApp.js - Simple version based on working UserApp.js structure

/* ----------------------- Core Utilities ----------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const PAGE = document.body.dataset.page || "unknown";
console.log('AdminApp: Page detected as:', PAGE);

/** Simple event helper */
function on(el, evt, handler, opts) {
  el?.addEventListener(evt, handler, opts);
}

/* ----------------------- Admin API Stubs ----------------------- */
const api = {
  async getStats() {
    await sleep(300);
    return {
      totalReports: 1234,
      pendingReports: 56,
      activeUsers: 789,
      revenue: 12500
    };
  },

  async getReports(filters = {}) {
    await sleep(400);
    return [
      { id: 1, species: "Turtle", location: "Ein Gev", date: "2024-01-15", status: "approved", user: "John Doe" },
      { id: 2, species: "Bird", location: "Bora Bora", date: "2024-01-14", status: "pending", user: "Jane Smith" },
      { id: 3, species: "Fish", location: "Red Sea", date: "2024-01-13", status: "denied", user: "Bob Wilson" }
    ];
  }
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ----------------------- Nav / Global ------------------------- */
function initReducedMotionFlag() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("reduced-motion");
    }
  } catch {}
}

function initAdminNavActive() {
  const currentPath = window.location.pathname;
  document.querySelectorAll(".admin-nav a").forEach(link => {
    if (link.href && new URL(link.href).pathname === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });
}

/* ----------------------- Logos ------------------------- */
function initLogos() {
  let LOGO_BASE = document.body.dataset.logoBase || "/assets/logos/";
  if (!LOGO_BASE.endsWith('/')) LOGO_BASE += '/';
  console.log('AdminApp: Initializing logos with base:', LOGO_BASE);

  const extDefault = ".svg";
  const getTheme = () => {
    const themeLink = document.getElementById('theme-css');
    return /dark/i.test(themeLink?.href || '') ? 'dark' : 'light';
  };

  function apply(el) {
    const name = el.dataset.logo || el.getAttribute('data-logo-bg');
    if (!name) return;
    const themed = !!el.dataset.logoThemed;
    const ext = el.dataset.logoExt || extDefault;
    const file = themed ? `${name}_${getTheme()}${ext}` : `${name}${ext}`;
    
    if (el.tagName === 'IMG') {
      el.src = LOGO_BASE + file;
    } else {
      el.style.backgroundImage = `url("${LOGO_BASE + file}")`;
      el.style.backgroundSize = el.dataset.logoBgSize || 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
    }
  }

  document.querySelectorAll('img[data-logo], [data-logo-bg]').forEach(el => {
    if (!el.dataset.logo && el.hasAttribute('data-logo-bg')) {
      el.dataset.logo = el.getAttribute('data-logo-bg');
    }
    apply(el);
  });

  window.addEventListener('ecologic:theme-change', () => {
    document.querySelectorAll('img[data-logo], [data-logo-bg]').forEach(apply);
  });
}

/* ----------------------- Icons ------------------------- */
(function initIcons() {
  let ICON_BASE = document.body.dataset.iconBase || "/assets/icons/";
  if (!ICON_BASE.endsWith('/')) ICON_BASE += '/';
  console.log('AdminApp: Initializing icons with base:', ICON_BASE);

  const ICON_EXT = '.svg';
  const getTheme = () => {
    const themeLink = document.getElementById('theme-css');
    return /dark/i.test(themeLink?.href || '') ? 'dark' : 'light';
  };

  const MAP = {
    house: { base: 'house' },
    doc: { base: 'doc' },
    export: { base: 'export' },
    chart: { base: 'chart' },
    logout: { base: 'logout' },
    user: { base: 'user' },
    ecologo: { base: 'ecologo' }
  };

  function iconFile(name, { active = false, theme = 'light' } = {}) {
    const cfg = MAP[name] || { base: name };
    if (cfg.themed) return `${cfg.base}_${theme}${ICON_EXT}`;
    if (active && cfg.click) return `${cfg.click}${ICON_EXT}`;
    return `${cfg.base}${ICON_EXT}`;
  }

  function applyIcon(img) {
    const name = img.dataset.icon;
    if (!name) return;

    const isActive = img.closest('a')?.getAttribute('aria-current') === 'page';
    const iconSrc = ICON_BASE + iconFile(name, { active: isActive, theme: getTheme() });
    console.log('AdminApp: Setting icon', name, 'to', iconSrc);
    img.src = iconSrc;
  }

  // Apply to any <img> that declares `data-icon`
  const iconElements = document.querySelectorAll("img[data-icon]");
  console.log('AdminApp: Found', iconElements.length, 'icon elements');
  iconElements.forEach(applyIcon);
  
  window.addEventListener("ecologic:theme-change", () =>
    document.querySelectorAll("img[data-icon]").forEach(applyIcon)
  );
})();

/* ----------------------- Page Initializers ----------------------- */
function initDashboard() {
  console.log('AdminApp: Initializing dashboard functionality');
  
  // Load dashboard stats
  api.getStats().then(stats => {
    console.log('AdminApp: Dashboard stats loaded:', stats);
    // Update dashboard UI with stats
  }).catch(err => console.error('AdminApp: Failed to load stats:', err));
}

function initReports() {
  console.log('AdminApp: Initializing reports functionality');
  
  // Load reports
  api.getReports().then(reports => {
    console.log('AdminApp: Reports loaded:', reports.length, 'reports');
    // Update reports table
  }).catch(err => console.error('AdminApp: Failed to load reports:', err));
}

function initAnalytics() {
  console.log('AdminApp: Initializing analytics functionality');
  // Initialize charts here
}

function initExport() {
  console.log('AdminApp: Initializing export functionality');
  // Initialize export handlers
}

/* ----------------------- Boot ----------------------- */
console.log('AdminApp: Script loaded, initializing...');

// Initialize global functionality
initReducedMotionFlag();
initAdminNavActive();
initLogos();

// Initialize page-specific functionality
switch (PAGE) {
  case 'dashboard':
    initDashboard();
    break;
  case 'reports':
    initReports();
    break;
  case 'analytics':
    initAnalytics();
    break;
  case 'export':
    initExport();
    break;
  default:
    console.log('AdminApp: No specific initializer for page:', PAGE);
}

console.log('AdminApp: Initialization complete');