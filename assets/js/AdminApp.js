// AdminApp.js — organized by topic for easy maintenance
console.log('AdminApp.js: Script loaded successfully');

/* ==========================================================
   Sections:
   1) Config & constants
   2) API stubs (TODO: replace with real endpoints)
   3) Utilities
   4) Logo & Icon runtimes
   5) Render helpers
   6) Page initializers (dashboard, reports, analytics)
   7) Boot
   ========================================================== */

/* ---------------------- 1) Config & constants ---------------------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// These will be set when DOM is ready in boot function
let PAGE_RAW, PAGE, THEME_LINK;

/* ---------------------- 2) API stubs (replace me) -----------------
   These are the single place to implement server calls later. Keep
   them small and return the same shape the UI expects.
*/
const API_BASE_URL = "/api";        // ← change to your real base path
const API_TIMEOUT  = 10000;         // ms

function authHeaders(){
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
const qs = obj =>
  Object.entries(obj || {})
    .filter(([,v]) => v !== "" && v != null)
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

async function http(method, path, { params, body } = {}){
  const url = new URL(API_BASE_URL + path, location.origin);
  if (params) url.search = qs(params);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), API_TIMEOUT);
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body && !(body instanceof Blob) ? {"Content-Type":"application/json"} : {}),
      ...authHeaders()
    },
    body: body ? (body instanceof Blob ? body : JSON.stringify(body)) : undefined,
    signal: ctl.signal
  });
  clearTimeout(t);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${method} ${path}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.blob();
}

/* ---------------------- Real API ---------------------- */
const api = {
  async getReports(filters = {}) {
    const cacheKey = `reports_${JSON.stringify(filters)}`;
    const cached = getCachedData(cacheKey, 60 * 60 * 1000); // 1 hour
    if (cached && cached.length > 0) {
      console.log('AdminApp: Using cached reports data with', cached.length, 'reports');
      return cached;
    }
    
    console.log('AdminApp: Cache miss or empty, fetching fresh reports data...');
    const data = await http("GET", "/reports", { params: filters });
    console.log('AdminApp: Raw API response:', data);
    
    // Handle the correct response format: { ok: true, reports: [...] }
    const result = data?.reports || data?.items || (Array.isArray(data) ? data : []);
    console.log('AdminApp: Processed reports data:', { length: result.length, sample: result.slice(0, 1) });
    setCachedData(cacheKey, result);
    return result;
  },
  async getStats() {
    const cacheKey = 'dashboard_stats';
    const cached = getCachedData(cacheKey, 60 * 60 * 1000); // 1 hour
    if (cached) {
      console.log('AdminApp: Using cached stats data');
      return cached;
    }
    
    const resp = await http("GET", "/dashboard-parser", { params: { endpoint: "dashboard_stats" } });
    const result = resp && resp.ok && resp.data ? resp.data : resp;
    setCachedData(cacheKey, result);
    return result;
  },
  async getLatest() {
    const cacheKey = 'dashboard_latest';
    const cached = getCachedData(cacheKey, 60 * 60 * 1000); // 1 hour
    if (cached) {
      console.log('AdminApp: Using cached latest data');
      return cached;
    }
    
    const resp = await http("GET", "/dashboard-parser", { params: { endpoint: "latest_reports" } });
    let result = [];
    if (resp && resp.ok && resp.data && Array.isArray(resp.data.items)) result = resp.data.items;
    else if (Array.isArray(resp?.items)) result = resp.items;
    setCachedData(cacheKey, result);
    return result;
  },
  async exportReports(format = "csv", filters = {}) {
    try {
      const response = await fetch(`/api/report-export-parser?format=${format}&${new URLSearchParams(filters).toString()}`);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
      
      // Get the blob directly from the response
      const blob = await response.blob();
      const filename = `reports.${format}`;
      const url = URL.createObjectURL(blob);
      
      return { ok: true, url, filename };
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  },
  approveReport(id) {
    return http("POST", `/reports/${id}/approve`);
  },
  denyReport(id) {
    return http("POST", `/reports/${id}/deny`);
  }
};

// Build unique, sorted species list from reports
function uniqueSpeciesFromReports(list){
  const set = new Set();
  list.forEach(r => r.species && set.add(r.species));
  return [...set].sort((a,b)=> a.localeCompare(b));
}

// Turn #filterSpecies into a <select> with all species (keeps same id/name/classes)
function upgradeSpeciesFilter(species){
  const node = document.getElementById("filterSpecies");
  if (!node) return;

  const makeOptions = (withAny=true) =>
    (withAny ? `<option value="">Any</option>` : "") +
    species.map(s => `<option value="${s}">${s}</option>`).join("");

  if (node.tagName === "SELECT"){
    node.innerHTML = makeOptions(true);
  } else {
    const sel = document.createElement("select");
    sel.className = node.className || "input";
    sel.id = node.id; sel.name = node.name || "species";
    sel.innerHTML = makeOptions(true);
    node.replaceWith(sel);
  }
}

// Initialize Kriging species dropdown with API data
async function initKrigingSpeciesDropdown() {
  try {
    // Fetch species from analytics parser
    const response = await fetch('/api/analytics-parser?endpoint=species_list');
    if (!response.ok) {
      console.warn('Failed to fetch species from analytics parser, falling back to empty dropdown');
      return;
    }
    
    const data = await response.json();
    const species = data.species || [];
    
    // Find the kriging species input and replace with dropdown
    const krigSpeciesInput = document.getElementById("krigSpecies");
    if (!krigSpeciesInput) return;
    
    // Create new select element
    const select = document.createElement("select");
    select.className = krigSpeciesInput.className || "input";
    select.id = krigSpeciesInput.id;
    select.name = krigSpeciesInput.name || "krigSpecies";
    select.style.cssText = krigSpeciesInput.style.cssText;
    
    // Create options - no "Any" option for Kriging since we want specific species
    const options = ['<option value="">Select species...</option>'];
    species.forEach(s => {
      const selected = s === "Thiara scabra" ? ' selected' : '';
      options.push(`<option value="${s}"${selected}>${s}</option>`);
    });
    select.innerHTML = options.join('');
    
    // Replace the input with select
    krigSpeciesInput.replaceWith(select);
    
    // Add event listener to update kriging map when species changes
    select.addEventListener('change', () => {
      // Dispatch custom event that StatsCharts.js can listen for
      const event = new CustomEvent('kriging-species-changed', {
        detail: { species: select.value }
      });
      document.dispatchEvent(event);
    });
    
    console.log(`Kriging species dropdown initialized with ${species.length} species, default: Thiara scabra`);
    
  } catch (error) {
    console.error('Error initializing Kriging species dropdown:', error);
  }
}



/* ---------------------- 3) Utilities ---------------------- */
function on(el, evt, handler, opts){ el?.addEventListener(evt, handler, opts); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function fmt(n){ return new Intl.NumberFormat().format(n); }

// localStorage caching helpers
function getCachedData(key, maxAge = 60 * 60 * 1000) {
  try {
    const cached = localStorage.getItem(`ecologic_cache_${key}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem(`ecologic_cache_${key}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('AdminApp: Cache read error:', error);
    return null;
  }
}

function setCachedData(key, data) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(`ecologic_cache_${key}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('AdminApp: Cache write error:', error);
  }
}

function clearCache() {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('ecologic_cache_'));
    keys.forEach(key => localStorage.removeItem(key));
    console.log('AdminApp: Cleared', keys.length, 'cached items');
  } catch (error) {
    console.warn('AdminApp: Cache clear error:', error);
  }
}

// Add clearCache to window for debugging
window.clearEcologicCache = clearCache;

// Logout functionality
function logout() {
  try {
    // Clear all cached data
    clearCache();
    
    // Clear any other stored data
    localStorage.removeItem('ecologic-auth');
    sessionStorage.clear();
    
    console.log('AdminApp: Logout - cleared all cached data');
    
    // Redirect to login
    window.location.href = '/login.html';
  } catch (error) {
    console.error('AdminApp: Logout error:', error);
    // Still redirect even if cache clear fails
    window.location.href = '/login.html';
  }
}

// Add logout event listeners to all logout links
document.addEventListener('DOMContentLoaded', function() {
  // Find all logout links/buttons
  const logoutElements = document.querySelectorAll('a[href="/login.html"], [data-icon="logout"]');
  
  logoutElements.forEach(element => {
    element.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  });
});

function initReducedMotionFlag(){ try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('reduced-motion'); } catch{} }
function initAdminNavActive(){ const path = location.pathname; $$('.admin-nav a').forEach(a => { const href = a.getAttribute('href'); if (href === path) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); }); }

/* ---------------------- 4) Logo & Icon runtimes ---------------------- */
function initLogos(){
  let LOGO_BASE = document.body.dataset.logoBase || "/assets/logos/";
  if (!LOGO_BASE.endsWith('/')) LOGO_BASE += '/';
  console.log('AdminApp: Initializing logos with base:', LOGO_BASE);
  const extDefault = ".svg";
  const getTheme = () => /dark/i.test(THEME_LINK?.href || '') ? 'dark' : 'light';

  function apply(el){
    const name = el.dataset.logo || el.getAttribute('data-logo-bg'); if (!name) return;
    const themed = !!el.dataset.logoThemed; const ext = el.dataset.logoExt || extDefault;
    const file = themed ? `${name}_${getTheme()}${ext}` : `${name}${ext}`;
    if (el.tagName === 'IMG') el.src = LOGO_BASE + file;
    else { 
      el.style.backgroundImage = `url("${LOGO_BASE + file}")`;
      el.style.backgroundSize = el.dataset.logoBgSize || 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      // Only set background-position if not already defined by CSS or if explicitly requested
      if (!el.style.backgroundPosition && !getComputedStyle(el).backgroundPosition.includes('center')) {
        el.style.backgroundPosition = 'center';
      }
    }
  }

  document.querySelectorAll('img[data-logo], [data-logo-bg]').forEach(el => { if (!el.dataset.logo && el.hasAttribute('data-logo-bg')) el.dataset.logo = el.getAttribute('data-logo-bg'); apply(el); });
  window.addEventListener('ecologic:theme-change', () => document.querySelectorAll('img[data-logo], [data-logo-bg]').forEach(apply));
}

(function initIcons(){
  let ICON_BASE = document.body.dataset.iconBase || "/assets/icons/"; if (!ICON_BASE.endsWith('/')) ICON_BASE += '/';
  console.log('AdminApp: Initializing icons with base:', ICON_BASE);
  const ICON_EXT = '.svg'; const getTheme = () => /dark/i.test(THEME_LINK?.href || '') ? 'dark' : 'light';
  const MAP = { house:{base:'house'}, doc:{base:'doc'}, export:{base:'export'}, chart:{base:'chart'}, logout:{base:'logout'}, user:{base:'user'}, ecologo:{base:'ecologo'} };

  function fileFor(name, {active=false, theme='light'}={}){ const cfg = MAP[name] || { base:name }; if (cfg.themed) return `${cfg.base}_${theme}${ICON_EXT}`; if (active && cfg.click) return `${cfg.click}${ICON_EXT}`; return `${cfg.base}${ICON_EXT}`; }
  function apply(img){ const name = img.dataset.icon; if (!name) return; const isActive = img.closest('a')?.getAttribute('aria-current') === 'page'; const iconSrc = ICON_BASE + fileFor(name, { active:isActive, theme:getTheme() }); console.log('AdminApp: Setting icon', name, 'to', iconSrc); img.src = iconSrc; }
  const iconElements = document.querySelectorAll('img[data-icon]'); console.log('AdminApp: Found', iconElements.length, 'icon elements'); iconElements.forEach(apply); window.addEventListener('ecologic:theme-change', () => document.querySelectorAll('img[data-icon]').forEach(apply));
})();

/* ---------------------- 5) Render helpers ---------------------- */

  function renderLatestItem(r){ return `
    <li class="report-item">
      <div class="report-main">
        <div class="report-where">${r.where} · ${r.species}</div>
        <div class="report-when">${r.when}</div>
      </div>
      <div class="report-side">
        <span class="status ${r.status === 'approved' ? 'status-approved' : r.status === 'pending' ? 'status-pending' : 'status-denied'}">
          ${r.status[0].toUpperCase() + r.status.slice(1)}
      </div>
    </li>`;
  }
  // (Removed demo analytics data)




/* ---------------------- 6) Page initializers ---------------------- */
async function initDashboard(){
  // Fetch data directly from dashboard-parser
  try {
    console.log('AdminApp: fetching dashboard data...');
    const [stats, latest] = await Promise.all([api.getStats(), api.getLatest()]);
    console.log('AdminApp: fetched KPIs ->', stats);
    console.log('AdminApp: fetched latest ->', Array.isArray(latest) ? `${latest.length} items` : latest);
    
    $('#kpiReportsToday')?.replaceChildren(document.createTextNode(stats?.reportsToday ?? 0));
    $('#kpiApprovalRate')?.replaceChildren(document.createTextNode(stats?.approvalRate ?? '0%'));
    $('#kpiActiveUsers')?.replaceChildren(document.createTextNode(stats?.activeUsers ?? 0));
    const list = $('#adminLatestReports'); if (list) list.innerHTML = (latest || []).slice(0,5).map(renderLatestItem).join('');
  } catch (e) {
    console.warn('AdminApp: dashboard data fetch failed:', e?.message || e);
  }
}

// small reusable CSV export helper
function csvFromTable(tbl, header = ["ID","Date","Time","Location","Status"]) {
  const bodyRows = [...tbl.tBodies[0]?.rows ?? []];
  const lines = [header.join(",")];
  for (const tr of bodyRows) {
    const cells = [...tr.cells].filter(td => !td.querySelector('input[type="checkbox"]')).map(td => (td.textContent ?? "").replace(/,/g, " ").trim());
    const [id, date, time, location, status] = cells; lines.push([id, date, time, location, status].join(","));
  }
  return lines.join("\n");
}

function chk(idAttr = "", className = "row-check") { return `
    <label class="chk">
      <input type="checkbox" ${idAttr} class="chk-input ${className}">
      <span class="chk-ctrl" aria-hidden="true"></span>
    </label>
  `; }

async function initReports(){
  const table = $('#adminReportTable'); if (!table) return;
  // ensure consistent column widths
  let cg = table.querySelector('colgroup'); if (!cg){ cg = document.createElement('colgroup'); cg.innerHTML = `
      <col class="col-check">
      <col class="col-id">
      <col class="col-species">
      <col class="col-date">
      <col class="col-time">
      <col class="col-location">
      <col class="col-status">
    `; table.prepend(cg); }
  const thead = table.tHead || table.createTHead(); thead.innerHTML = `
    <tr>
      <th class="cell-check">${chk('id="selectAll"','row-check')}</th>
      <th>ID</th>
      <th>Date</th>
      <th>Species</th>
      <th>Time</th>
      <th>Location</th>
      <th>Status</th>
    </tr>`;
  const tbody = table.tBodies[0] || table.createTBody(); tbody.innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;
  
  // Fetch reports using the same pattern as dashboard
  console.log('AdminApp: Loading reports...');
  const ALL = await api.getReports();
  console.log('AdminApp: Loaded', ALL.length, 'reports');
  console.log('AdminApp: Sample report data:', ALL.slice(0, 2)); // Show first 2 reports

  function applyFilters(){
    const status = $('#filterStatus')?.value || '';
    const from = $('#filterDateFrom')?.value || '';
    const to = $('#filterDateTo')?.value || '';
    let out = [...ALL]; if (status) out = out.filter(r => r.status === status); if (from) out = out.filter(r => r.when?.slice(0,10) >= from); if (to) out = out.filter(r => r.when?.slice(0,10) <= to);
    
    console.log('AdminApp: Applying filters - status:', status, 'from:', from, 'to:', to);
    console.log('AdminApp: Filtered reports count:', out.length);
    
    tbody.innerHTML = out.length ? out.map(renderReportRow).join('') : `<tr><td colspan="6">No rows.</td></tr>`;
    console.log('AdminApp: Table body updated with', out.length, 'rows');
    
    const selAll = $('#selectAll'); if (selAll) selAll.checked = false;
  }

  function renderReportRow(r){ 
    const when = r.when || ""; 
    const date = when.slice(0,10); 
    const time = when.slice(11);
    
    // Format ID: first 3 digits + "..." + last 3 digits
    const formatId = (id) => {
      if (!id || id.length <= 6) return id;
      return `${id.slice(0, 3)}...${id.slice(-3)}`;
    };
    
    console.log('AdminApp: Rendering report row:', { id: r.id, species: r.species, status: r.status, when: r.when });
    return `
      <tr data-id="${r.id}">
        <td class="cell-check">${chk('', 'row-check')}</td>
        <td title="${r.id}">${formatId(r.id)}</td>
        <td>${date}</td>
        <td>${r.species || ''}</td>
        <td>${time}</td>
        <td>${r.where || ''}</td>
        <td>${r.status || ''}</td>
      </tr>`; 
  }

  on($('#btnApplyFilters'), 'click', applyFilters);
  on($('#btnClearFilters'), 'click', () => { ['#filterStatus','#filterDateFrom','#filterDateTo'].forEach(sel => { const el=$(sel); if (el) el.value=''; }); applyFilters(); });
  on($('#selectAll'), 'change', (e) => { const onOff = e.currentTarget.checked; $$('#adminReportTable tbody .row-check').forEach(cb => (cb.checked = onOff)); });
  on(tbody, 'change', (e) => { if (!e.target.matches('.row-check')) return; const all = $$('#adminReportTable tbody .row-check'); const selAll = $('#selectAll'); if (selAll) selAll.checked = (all.length && all.every(c => c.checked)); });
  
  console.log('AdminApp: Initializing reports table with', ALL.length, 'total reports');
  applyFilters();
  console.log('AdminApp: Reports table initialization complete');
}

async function initAnalytics(){
  if (typeof Chart === "undefined") return;

  // match theme
  Chart.defaults.plugins.legend.display = true;
  Chart.defaults.color = getComputedStyle(document.body).color;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

  const ALL = await api.getReports();
  

  // 1) species list + upgrade the page filter to a dropdown
  // Build lists from data and upgrade filters to dropdowns
  const SPECIES   = uniqueFromReports(ALL, "species");
  const LOCATIONS = uniqueFromReports(ALL, "where"); // "where" holds the location

  upgradeFilterToSelect("filterSpecies",  SPECIES,   "Any");
  upgradeFilterToSelect("filterLocation", LOCATIONS, "Any");

// (If your series overlay uses SPECIES for its own per-series selects,
// keep using SPECIES as before — no other changes needed.)

  upgradeSpeciesFilter(SPECIES);

  // Initialize Kriging species dropdown
  await initKrigingSpeciesDropdown();
  
  // Auto-run Kriging with default species on page load
  // We'll dispatch a custom event that StatsCharts.js can listen for
  setTimeout(() => {
    const event = new CustomEvent('krging-dropdown-ready');
    document.dispatchEvent(event);
  }, 100);

  // 2) chart boot
  const ctx = document.getElementById("analyticsChart")?.getContext?.("2d");
  if (!ctx) return;

  let chart = null;

  // 3) seed TWO default series (fall back gracefully if not present)
  const wanted = ["Green Toad", "Blue Crab"];
  const defaults = wanted
    .map(w => SPECIES.find(s => s.toLowerCase() === w.toLowerCase()))
    .filter(Boolean);
  const series = defaults.length ? defaults.map(v => ({ value: v })) : [{ value: "" }];

  const seriesList  = document.getElementById("seriesList");
  const chartTypeEl = document.getElementById("chartType");
  const addBtn      = document.getElementById("btnAddSeries");

  // small helpers
  const hsl = (i, a=1) => `hsl(${(i*53)%360} 90% 60% / ${a})`;

  function monthlyCounts(list, speciesFilter){
    const f = (speciesFilter||"").toLowerCase();
    const src = f ? list.filter(r => (r.species||"").toLowerCase() === f) : list;
    const m = {};
    src.forEach(r => { const ym = (r.when||"").slice(0,7); m[ym]=(m[ym]||0)+1; });
    const labels = Object.keys(m).sort();
    return { labels, map:m };
  }
  const union = arrs => [...new Set(arrs.flat())].sort();

  function renderSeriesList(){
    const opts = [`<option value="">All species</option>`, ...SPECIES.map(s => `<option value="${s}">${s}</option>`)].join("");
    seriesList.innerHTML = series.map((s,i)=>`
      <li class="report-item" data-idx="${i}">
        <div class="report-main" style="gap:8px;">
          <div class="report-where" style="display:flex; align-items:center; gap:8px;">
            <span style="inline-size:12px; block-size:12px; border-radius:50%; background:${hsl(i)};"></span>
            <select class="input series-species" style="width:240px;">${opts}</select>
          </div>
        </div>
        <div class="report-side">
          <button class="btn btn-ghost" type="button" data-remove="1">Remove</button>
        </div>
      </li>
    `).join("");

    // set current values and wire events
    $$("li[data-idx] .series-species", seriesList).forEach(sel => {
      const idx = Number(sel.closest("li[data-idx]").dataset.idx);
      sel.value = series[idx].value || "";
      sel.addEventListener("change", () => { series[idx].value = sel.value; refreshChart(); });
    });
    $$("li[data-idx] [data-remove]", seriesList).forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.closest("li[data-idx]").dataset.idx);
        series.splice(idx, 1);
        renderSeriesList(); refreshChart();
      });
    });
  }

  // Build unique, sorted lists from reports
  function uniqueFromReports(list, key){
    const s = new Set();
    list.forEach(r => r[key] && s.add(r[key]));
    return [...s].sort((a,b) => a.localeCompare(b));
  }

  // Replace an <input id="..."> with a <select id="..."> populated with options.
  // If it's already a <select>, just repopulate.
  function upgradeFilterToSelect(id, items, anyLabel = "Any"){
    const node = document.getElementById(id);
    if (!node) return;
    const opts = [`<option value="">${anyLabel}</option>`, ...items.map(v => `<option value="${v}">${v}</option>`)].join("");

    if (node.tagName === "SELECT"){
      node.innerHTML = opts;
    } else {
      const sel = document.createElement("select");
      sel.className = node.className || "input";
      sel.id = node.id;
      sel.name = node.name || id.replace(/^filter/i, "").toLowerCase();
      sel.innerHTML = opts;
      node.replaceWith(sel);
    }
  }


  // Replace an <input id="..."> with a <select id="..."> and fill options.
  // If the node is already <select>, just (re)populate it.
  function upgradeFilterToSelect(id, items, anyLabel = "Any"){
    const node = document.getElementById(id);
    if (!node) return;
    const makeOptions = () =>
      `<option value="">${anyLabel}</option>` +
      items.map(v => `<option value="${v}">${v}</option>`).join("");

    if (node.tagName === "SELECT"){
      node.innerHTML = makeOptions();
    } else {
      const sel = document.createElement("select");
      sel.className = node.className || "input";
      sel.id = node.id;
      sel.name = node.name || id.replace(/^filter/i, "").toLowerCase();
      sel.innerHTML = makeOptions();
      node.replaceWith(sel);
    }
  }


  function refreshChart(){
    // base list from page filters EXCEPT species (species is per-series)
    const base = filterReports(ALL, { ...readFilters(), species: "" });

    const per = series.map(s => monthlyCounts(base, s.value));
    const months = union(per.map(p => p.labels));

    const type = chartTypeEl?.value || "line";
    const datasets = per.map((p,i)=>({
      label: series[i].value || "All species",
      data: months.map(m => p.map[m] || 0),
      borderColor: hsl(i, 1),
      backgroundColor: hsl(i, type === "bar" ? 0.25 : 0.15),
      tension: 0.3,
      fill: false
    }));

    if (!chart){
      chart = new Chart(ctx, {
        type,
        data: { labels: months, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, ticks:{ precision:0 } } }
        }
      });
    } else {
      chart.config.type   = type;
      chart.data.labels   = months;
      chart.data.datasets = datasets;
      chart.update();
    }
  }

  // wires
  addBtn?.addEventListener("click", () => {
    series.push({ value: SPECIES[0] || "" });
    renderSeriesList(); refreshChart();
  });
  chartTypeEl?.addEventListener("change", refreshChart);

  // shared filter buttons also drive the chart
  on($("#btnApplyFilters"), "click", refreshChart);
  on($("#btnClearFilters"), "click", () => {
    ["#filterSpecies","#filterStatus","#filterDateFrom","#filterDateTo","#filterLocation"].forEach(s => { const el=$(s); if (el) el.value=""; });
    // keep current series; just re-filter the base
    refreshChart();
  });

  // first paint
  renderSeriesList();
  refreshChart();
}

async function initExport(){
  initReports(); // reuse reports table init
  const table = document.getElementById('adminReportTable');
  if (!table) return;

  // Build header in your existing <thead>/<tbody>
  const thead = table.tHead || table.createTHead();
  thead.innerHTML = `
    <tr>
      <th class="cell-check">${chk('id="selectAll"','row-check')}</th>
      <th>ID</th>
      <th>Date</th>
      <th>Species</th>
      <th>Time</th>
      <th>Location</th>
      <th>Status</th>
    </tr>
  `;
  const tbody = table.tBodies[0] || table.createTBody();
  tbody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;

  // Load all rows using the same pattern as dashboard
  console.log('AdminApp: Loading reports for export...');
  const ALL = await api.getReports();
  console.log('AdminApp: Loaded', ALL.length, 'reports for export');

  // Populate dropdown filters (same as Analytics)
  const SPECIES   = uniqueFromReports(ALL, 'species');
  const LOCATIONS = uniqueFromReports(ALL, 'where');
  upgradeFilterToSelect('filterSpecies',  SPECIES,   'Any');
  upgradeFilterToSelect('filterLocation', LOCATIONS, 'Any');

  // Helpers
  function renderRow(r){
    const when = r.when || '';
    const date = when.slice(0,10);
    const time = when.slice(11);
    return `
      <tr data-id="${r.id}">
        <td class="cell-check"><input type="checkbox" class="row-check"></td>
        <td>${r.id ?? ''}</td>
        <td>${date}</td>
        <td>${r.species || ''}</td>
        <td>${time}</td>
        <td>${r.where || ''}</td>
        <td>${r.status || ''}</td>
      </tr>
    `;
  }
  function readFilters(){
    return {
      status:   document.getElementById('filterStatus')?.value || '',
      species:  document.getElementById('filterSpecies')?.value || '',
      location: document.getElementById('filterLocation')?.value || '',
      from:     document.getElementById('filterDateFrom')?.value || '',
      to:       document.getElementById('filterDateTo')?.value || '',
    };
  }
  function applyFilters(){
    const f = readFilters();
    let out = ALL.slice();
    if (f.status)   out = out.filter(r => r.status === f.status);
    if (f.species)  out = out.filter(r => (r.species || '') === f.species);
    if (f.location) out = out.filter(r => (r.where   || '') === f.location);
    if (f.from)     out = out.filter(r => (r.when || '').slice(0,10) >= f.from);
    if (f.to)       out = out.filter(r => (r.when || '').slice(0,10) <= f.to);

    tbody.innerHTML = out.length
      ? out.map(renderRow).join('')
      : `<tr><td colspan="7">No rows.</td></tr>`;

    const selAll = document.getElementById('selectAll');
    if (selAll) selAll.checked = false;
    return out; // return current filtered rows for export
  }

  // Export using report-export-parser
  async function doExport(formatArg){
    const format = formatArg || document.getElementById('exportFormat')?.value || 'csv';
    const filters = readFilters();

    try {
      console.log('AdminApp: Exporting reports as', format, 'with filters:', filters);
      const res = await api.exportReports(format, filters);
      if (res && res.ok && res.url){
        const a = document.getElementById('downloadLink');
        a.href = res.url;
        a.download = res.filename || `reports.${format}`;
        a.style.display = '';
        a.click();
        setTimeout(() => URL.revokeObjectURL(res.url), 1500);
        console.log('AdminApp: Export completed successfully');
        return;
      }
    } catch(e){ 
      console.error('AdminApp: Export failed:', e);
      alert('Export failed: ' + (e.message || e));
    }
  }

  // Wires
  document.getElementById('btnApplyFilters')?.addEventListener('click', applyFilters);
  document.getElementById('btnClearFilters')?.addEventListener('click', () => {
    ['filterStatus','filterSpecies','filterLocation','filterDateFrom','filterDateTo']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    applyFilters();
  });
  document.getElementById('selectAll')?.addEventListener('change', (e) => {
    const onOff = e.currentTarget.checked;
    table.querySelectorAll('tbody .row-check').forEach(cb => (cb.checked = onOff));
  });
  tbody.addEventListener('change', (e) => {
    if (!e.target.matches('.row-check')) return;
    const all = [...table.querySelectorAll('tbody .row-check')];
    const selAll = document.getElementById('selectAll');
    if (selAll) selAll.checked = (all.length && all.every(c => c.checked));
  });
  document.getElementById('btnExport')?.addEventListener('click', async () => { applyFilters(); await doExport(); });

  // page uses separate export buttons; wire them to apply filters then export
  const btnCSV  = document.getElementById('btnExportCSV');
  const btnXLSX = document.getElementById('btnExportXLSX');
  const btnJSON = document.getElementById('btnExportJSON');
  btnCSV?.addEventListener('click', async () => { applyFilters(); await doExport('csv'); });
  btnXLSX?.addEventListener('click', async () => { applyFilters(); await doExport('xlsx'); });
  btnJSON?.addEventListener('click', async () => { applyFilters(); await doExport('json'); });

  // First paint
  applyFilters();
}


/* ---------------------- 7) Boot ---------------------- */
document.addEventListener('DOMContentLoaded', function boot(){
  // Set page variables when DOM is ready
  PAGE_RAW = document.body.dataset.page || "unknown";
  PAGE = PAGE_RAW.replace(/^admin-/, "");
  THEME_LINK = document.getElementById('theme-css');
  
  console.log('AdminApp: Starting boot process for page:', PAGE);
  console.log('AdminApp: PAGE_RAW was:', PAGE_RAW);
  console.log('AdminApp: document.body.dataset.page is:', document.body.dataset.page);
  initReducedMotionFlag();
  initAdminNavActive();
  initLogos();
  switch (PAGE){
    case 'dashboard': console.log('AdminApp: Initializing dashboard'); initDashboard(); break;
    case 'reports':   console.log('AdminApp: Initializing reports'); initReports();   break;
    case 'analytics': console.log('AdminApp: Initializing analytics'); initAnalytics(); break;
    case 'export':    console.log('AdminApp: Initializing export'); initExport();    break;
    default: console.log('AdminApp: No page initializer for:', PAGE); /* no-op */
  }
});


