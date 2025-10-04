// app.js (no modules)

document.addEventListener('DOMContentLoaded', function() {

/* ----------------------- Core Utilities ----------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const PAGE = document.body.dataset.page || "unknown";

/** Simple event helper */
function on(el, evt, handler, opts) {
  el?.addEventListener(evt, handler, opts);
}

/** Fake API layer (swap later with real endpoints) */
const api = {
  async login({ email, password }) {
    // TODO: replace with real fetch
    await sleep(400);
    // mock success if both fields exist
    return email && password
      ? { ok: true, user: { name: "Shabi Shablul", coins: 999999 } }
      : { ok: false, error: "Missing credentials" };
  },

  async getWallet() {
    await sleep(250);
    return { coins: 999999 };
  },

  async getRecentReports() {
    await sleep(300);
    // Matches your UI example
    return [
      { when: "Jan 1st, 2002 · 16:45", where: "Ein Gev", coins: 10, status: "approved" },
      { when: "Jan 1st, 2002 · 16:45", where: "Bora Bora", coins: 10, status: "pending" },
      { when: "Jan 1st, 2002 · 16:45", where: "Ein Gev", coins: 10, status: "denied" },
    ];
  },
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

function initBottomNavActive() {
  // Mark current nav item active by href matching current page
  const path = location.pathname.split("/").pop();
  $$(".nav a").forEach(a => {
    const href = a.getAttribute("href");
    if (href === path) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/* ----------------------- Page Inits --------------------------- */
async function initWelcome() {
  // Optional: analytics, CTA wiring, etc.
}

function initLogin() {
}

async function initHome() {
  // Greet using session (fallback to sample name)
  const name = sessionStorage.getItem("userName") || "Shabi Shablul";
  const nameSlot = $('[aria-label="User display name"]');
  if (nameSlot) nameSlot.textContent = name;

  // Wallet
  const wallet = await api.getWallet();
  const money = $("#walletAmount");
  if (money && wallet?.coins != null) money.textContent = formatNumber(wallet.coins);

  // Recent reports
  const list = $("#recentReports");
  if (list) {
    const items = await api.getRecentReports();
    list.innerHTML = items.map(renderReportItem).join("");
  }
}

function initReport() {
  // Capture page wiring will go here (form submit, validation, etc.)
}

function initCamera() {
  // Camera page: you can access getUserMedia here, then later plug into your RAG.
  // Keep it simple: just the bootstrapping logic in JS; UI stays in HTML/CSS.
}

function initShop() {
  const grid = document.getElementById("shopGrid");
  const walletLabel = document.getElementById("walletAmountShop");

  // Your 4 items (edit titles/descriptions/prices as you wish)
  const products = [
    { id:"bora",   title:"Bora",   desc:"Special reward", price:250, img:"../assets/rewards/bora.png",   logo:true },
    { id:"eingev", title:"Ein Gev",desc:"Special reward", price:300, img:"../assets/rewards/eingev.png", logo:true },
    { id:"maagan", title:"Maagan", desc:"Special reward", price:275, img:"../assets/rewards/maagan.png", logo:true },
    { id:"miriam", title:"Miriam", desc:"Special reward", price:225, img:"../assets/rewards/miriam.png", logo:true }
  ];

  const coinIcon = "../assets/logos/EcoCoinSVG.svg";

  function renderCard(p){
    const logoClass = p.logo ? " is-logo" : "";
    // use lazy loading for perf
    return `
      <li class="shop-card">
        <img class="shop-thumb${logoClass}" src="${p.img}" alt="${p.title} thumbnail"
             loading="lazy" decoding="async"
             onerror="this.style.display='none'" />
        <div class="shop-body">
          <h3 class="shop-title">${p.title}</h3>
          <p class="shop-desc">${p.desc || ""}</p>
        </div>
        <div class="shop-foot">
          <span class="price">
            <img class="inline-icon" src="${coinIcon}" alt="" aria-hidden="true" />
            ${p.price}
          </span>
          <button class="btn btn-primary" data-sku="${p.id}">
            Redeem
          </button>
        </div>
      </li>`;
  }

  if (grid){
    grid.innerHTML = products.map(renderCard).join("");
    grid.setAttribute("aria-busy","false");
  }

  // Redeem handler (mock)
  grid?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-sku]");
    if (!btn) return;
    const sku = btn.getAttribute("data-sku");
    const product = products.find(p => p.id === sku);
    if (!product) return;

    const current = Number((walletLabel?.textContent || "0").replace(/[^\d]/g,"")) || 0;
    if (current < product.price) { alert("Not enough EcoCoins."); return; }

    alert(`Redeemed: ${product.title} ✅`);
    const newBal = current - product.price;
    if (walletLabel) walletLabel.textContent = newBal.toLocaleString();
  });
}



function initProfile(){
  // name (if you keep this)
  const name = sessionStorage.getItem("userName") || "Shabi Shablul";
  const nameSlot = document.getElementById("profileName");
  if (nameSlot) nameSlot.textContent = name;

  // Dark mode toggle in header
  const darkBtn = document.getElementById("toggleDarkMode");
  darkBtn?.addEventListener("click", () => {
    // If your ThemeToggle exposes a method, use it…
    if (window.ThemeToggle && typeof window.ThemeToggle.toggle === "function") {
      window.ThemeToggle.toggle();
    } else {
      // …otherwise do a simple swap:
      const link = document.getElementById("theme-css");
      if (!link) return;
      const isDark = /style_dark\.css/i.test(link.href);
      link.href = link.href.replace(isDark ? "style_dark.css" : "style_light.css",
                                    isDark ? "style_light.css" : "style_dark.css");
      // let icon runtime know
      window.dispatchEvent(new CustomEvent("ecologic:theme-change"));
    }
  });

  // Row clicks already use real hrefs; add JS hooks if needed:
  document.getElementById("openPersonalSettings")?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Personal Settings coming soon.");
  });
  document.getElementById("openPurchaseHistory")?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Purchase history coming soon.");
  });
  document.getElementById("openSecurity")?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Security settings coming soon.");
  });

  // Logout: clear session and go to home (or login)
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    try {
      // Clear all cached data
      const keys = Object.keys(localStorage).filter(key => key.startsWith('ecologic_cache_'));
      keys.forEach(key => localStorage.removeItem(key));
      console.log('UserApp: Logout - cleared', keys.length, 'cached items');
      
      // Clear other stored data
      sessionStorage.clear();
      localStorage.removeItem("ecologic-auth");
      
      location.href = "../index.html";
    } catch (error) {
      console.error('UserApp: Logout error:', error);
      // Still redirect even if cache clear fails
      location.href = "../index.html";
    }
  });
}


/* ----------------------- Helpers ------------------------------ */
function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

function renderReportItem({ when, where, coins, status }) {
  const statusClass =
    status === "approved" ? "status-approved" :
    status === "pending"  ? "status-pending"  :
    "status-denied";

  return `
    <li class="report-item">
      <div class="report-main">
        <div class="report-when">${when}</div>
        <div class="report-where">${where}</div>
      </div>
      <div class="report-side">
        <span class="report-coins">${coins}</span>
        <span class="status ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    </li>`;
}

function toggleForm(form, enabled) {
  $$("input, button, a", form).forEach(el => el.disabled = !enabled);
}

/* ----------------------- Boot ------------------------------- */
(function boot() {
  initReducedMotionFlag();
  initBottomNavActive();

  switch (PAGE) {
    case "welcome":  initWelcome();  break;
    case "login":    initLogin();    break;
    case "home":     initHome();     break;
    case "report":   initReport();   break;
    case "camera":   initCamera();   break;
    case "shop":     initShop();     break;
    case "profile":  initProfile();  break;
    default: /* no-op */
  }
})();


(function initIcons(){
  // ✅ read from the page; ensure trailing slash
  let ICON_BASE = (document.body && document.body.dataset.iconBase) || "../assets/icons/";
  if (!ICON_BASE.endsWith('/')) ICON_BASE += '/';
  const ICON_EXT  = ".svg"; // using SVG icons from assets/icons/

  const ICONS = {
    house:   { base:"house",   click:"house_click" },
    doc:     { base:"doc",     click:"doc_click" },
    camera:  { base:"camera",  click:"camera_click" },
    bag:     { base:"bag",     click:"bag_click" },
    cart:    { base:"cart",    click:"cart_click" },
    user:    { base:"user",    click:"user_click" },
    tag:     { base:"tag",     click:"tag_click" },
    database:{ base:"database" },
    history: { base:"history" },
    money: { base:"money" },
    data:   { base:"data" },
    shield: { base:"shield" },
    id_card: { base:"id_card" },
    id:      { base:"id" },
    lock:    { base:"lock" },
    moon:    { themed:true, base:"moon" },
    logout:  { base:"logout" }
  };

  const getTheme = () => /dark/i.test(document.getElementById('theme-css')?.href || "") ? "dark" : "light";

  function iconFile(name, { active=false, theme="light" }={}){
    const cfg = ICONS[name] || { base:name };
    if (cfg.themed) return `${cfg.base}_${theme}${ICON_EXT}`;
    if (active && cfg.click) return `${cfg.click}${ICON_EXT}`;
    return `${cfg.base}${ICON_EXT}`;
  }

  function applyIcon(img){
    const name = img.dataset.icon;
    if (!name) return;
    const theme    = getTheme();
    const isActive = img.closest("a")?.getAttribute("aria-current") === "page";
    img.src = ICON_BASE + iconFile(name, { active:isActive, theme });

    // pressed-state feedback (if *_click exists)
    const hasClick = ICONS[name] && ICONS[name].click;
    if (hasClick){
      const a = img.closest("a");
      const toPressed = () => img.src = ICON_BASE + iconFile(name, { active:true, theme:getTheme() });
      const toNormal  = () => img.src = ICON_BASE + iconFile(name, { active:isActive, theme:getTheme() });
      if (a){
        a.addEventListener("mousedown", toPressed);
        a.addEventListener("touchstart", toPressed, { passive:true });
        ["mouseup","mouseleave","touchend","blur"].forEach(ev => a.addEventListener(ev, toNormal));
      }
    }
  }

  // Apply to any <img> that declares `data-icon` (nav icons + inline icons in lists/buttons)
  document.querySelectorAll("img[data-icon]").forEach(applyIcon);
  window.addEventListener("ecologic:theme-change", () =>
    document.querySelectorAll("img[data-icon]").forEach(applyIcon)
  );

})();
});
