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
const PAGE_RAW = document.body.dataset.page || "unknown";
// normalize admin pages: admin-dashboard -> dashboard
const PAGE = PAGE_RAW.replace(/^admin-/, "");
const THEME_LINK = document.getElementById('theme-css');

/* ---------------------- 2) API stubs (replace me) -----------------
   These are the single place to implement server calls later. Keep
   them small and return the same shape the UI expects.
*/
/* ===================================================================
   API MIGRATION STUB
   Flip API_USE_STUB=false to use the real backend.
   Keeps your existing calls:
     - api.getReports(filters?)
     - api.getStats()
     - api.exportReports(format?, filters?)
     - api.approveReport(id)
     - api.denyReport(id)
=================================================================== */
const API_USE_STUB = true;          // ← set to false when backend is ready
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

/* ---------------------- Real API (when ready) ---------------------- */
function makeHttpApi(){
  return {
    async getReports(filters = {}) {
      // Expecting server to support query params: status, species, location, from, to
      // Return shape can be either [] or { items: [] } — normalize below
      const data = await http("GET", "/reports", { params: filters });
      return Array.isArray(data) ? data : (data.items || []);
    },
    async getStats(){
      return http("GET", "/stats");
    },
    async exportReports(format = "csv", filters = {}){
      // If your backend returns a file: GET /reports/export?format=csv&...
      const blob = await http("GET", "/reports/export", { params: { format, ...filters } });
      const filename = `reports.${format === "xlsx" ? "xlsx" : format}`;
      const url = URL.createObjectURL(blob);
      return { ok: true, url, filename };
    },
    async approveReport(id){
      return http("POST", `/reports/${id}/approve`);
    },
    async denyReport(id){
      return http("POST", `/reports/${id}/deny`);
    }
  };
}

/* ---------------------- Local STUB (current) ---------------------- */
function makeStubApi(){
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const seed = [
    { id:1001, when:"2025-09-01 10:00", where:"Ein Gev",   species:"Green Toad", status:"approved", coins:12, user:"shabi" },
    { id:1002, when:"2025-09-02 11:30", where:"Bora Bora", species:"Blue Crab",  status:"pending",  coins: 8, user:"miriam"},
    { id:1003, when:"2025-09-03 09:12", where:"Maagan",    species:"Cormorant", status:"denied",   coins: 0, user:"dani"  }
  ];

  const filterLocal = (list, f={}) => list.filter(r =>
    (!f.status   || r.status === f.status) &&
    (!f.species  || (r.species||"").toLowerCase().includes(String(f.species).toLowerCase())) &&
    (!f.location || (r.where||"").toLowerCase().includes(String(f.location).toLowerCase())) &&
    (!f.from     || (r.when||"").slice(0,10) >= f.from) &&
    (!f.to       || (r.when||"").slice(0,10) <= f.to)
  );

  function csvBlob(items){
    const header = "id,when,where,species,status,coins,user";
    const lines = items.map(r => [
      r.id, r.when, r.where, r.species, r.status, r.coins ?? "", r.user ?? ""
    ].map(v => String(v).replace(/,/g," ")).join(","));
    return new Blob([ [header, ...lines].join("\n") ], { type:"text/csv" });
  }
  function jsonBlob(items){
    return new Blob([ JSON.stringify(items, null, 2) ], { type:"application/json" });
  }

  return {
    async getReports(filters = {}){ await delay(120); return filterLocal(seed, filters); },
    async getStats(){ await delay(80); return { reportsToday: 4, approvalRate: "82%", activeUsers: 123 }; },
    async exportReports(format = "csv", filters = {}){
      await delay(60);
      const list = filterLocal(seed, filters);
      const blob = format === "json" ? jsonBlob(list) : csvBlob(list); // simple CSV-as-XLSX if you want: still a CSV
      const url = URL.createObjectURL(blob);
      const filename = `reports.${format === "xlsx" ? "xlsx" : format}`;
      return { ok: true, url, filename };
    },
    async approveReport(id){ await delay(40); return { ok: true, id }; },
    async denyReport(id){ await delay(40); return { ok: true, id }; }
  };
}

/* ---------------------- Choose backend & expose -------------------- */
const API = API_USE_STUB ? makeStubApi() : makeHttpApi();

/* Back-compat surface used across the app */
const api = {
  getReports:      (filters = {}) => API.getReports(filters),
  getStats:        ()              => API.getStats(),
  exportReports:   (format, filters) => API.exportReports(format, filters),
  approveReport:   (id)            => API.approveReport(id),
  denyReport:      (id)            => API.denyReport(id),
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



/* ---------------------- 3) Utilities ---------------------- */
function on(el, evt, handler, opts){ el?.addEventListener(evt, handler, opts); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function fmt(n){ return new Intl.NumberFormat().format(n); }

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
    else { el.style.backgroundImage = `url("${LOGO_BASE + file}")`; el.style.backgroundSize = el.dataset.logoBgSize || 'contain'; el.style.backgroundRepeat = 'no-repeat'; el.style.backgroundPosition = 'center'; }
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
  // --- DEMO DATA for Analytics if API returns empty ---
  function seedAnalyticsDemo(){
    const LOCS = ["Ein Gev","Bora Bora","Maagan"];
    const SPEC = ["Green Toad","Blue Crab","Cormorant"];
    const STAT = ["approved","pending","denied"];
    const USERS = ["shabi","miriam","noa","dani"];
    const out = [];
    const now = new Date();

    // last 8 months, ~12 reports each
    for (let m=0; m<8; m++){
      const monthStart = new Date(now.getFullYear(), now.getMonth()-m, 1);
      for (let i=0; i<12; i++){
        const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + i*2);
        const yyyy = d.getFullYear();
        const mm   = String(d.getMonth()+1).padStart(2,'0');
        const dd   = String(d.getDate()).padStart(2,'0');
        const hh   = String(9 + (i % 8)).padStart(2,'0');
        const mi   = String(10 + (i % 50)).padStart(2,'0');
        out.push({
          id: 5000 + out.length,
          when: `${yyyy}-${mm}-${dd} ${hh}:${mi}`,
          where: LOCS[(i+m) % LOCS.length],
          species: SPEC[(i*2+m) % SPEC.length],
          status: STAT[(i+m*3) % STAT.length],
          coins: [0,8,10,12][(i+m) % 4],
          user: USERS[(i+m) % USERS.length],
        });
      }
    }
    return out;
  }




/* ---------------------- 6) Page initializers ---------------------- */
async function initDashboard(){
  const [stats, reports] = await Promise.all([api.getStats(), api.getReports()]);
  $('#kpiReportsToday')?.replaceChildren(document.createTextNode(stats.reportsToday));
  $('#kpiApprovalRate')?.replaceChildren(document.createTextNode(stats.approvalRate));
  $('#kpiActiveUsers')?.replaceChildren(document.createTextNode(stats.activeUsers));
  const list = $('#adminLatestReports'); if (list) list.innerHTML = reports.slice(0,5).map(renderLatestItem).join('');
}

// small reusable CSV export helper (kept exported for reuse)
export function csvFromTable(tbl, header = ["ID","Date","Time","Location","Status"]) {
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
      <th class="cell-check">${chk('id="selectAll"','')}</th>
      <th>ID</th>
      <th>Date</th>
      <th>Species</th>
      <th>Time</th>
      <th>Location</th>
      <th>Status</th>
    </tr>`;
  const tbody = table.tBodies[0] || table.createTBody(); tbody.innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;
  const ALL = await api.getReports();

  function applyFilters(){
    const status = $('#filterStatus')?.value || '';
    const from = $('#filterDateFrom')?.value || '';
    const to = $('#filterDateTo')?.value || '';
    let out = [...ALL]; if (status) out = out.filter(r => r.status === status); if (from) out = out.filter(r => r.when?.slice(0,10) >= from); if (to) out = out.filter(r => r.when?.slice(0,10) <= to);
    tbody.innerHTML = out.length ? out.map(renderReportRow).join('') : `<tr><td colspan="6">No rows.</td></tr>`;
    const selAll = $('#selectAll'); if (selAll) selAll.checked = false;
  }

  function renderReportRow(r){ const when = r.when || ""; const date = when.slice(0,10); const time = when.slice(11); return `
      <tr data-id="${r.id}">
        <td class="cell-check">${chk('', 'row-check')}</td>
        <td>${r.id ?? ''}</td>
        <td>${date}</td>
        <td>${r.species || ''}</td>
        <td>${time}</td>
        <td>${r.where || ''}</td>
        <td>${r.status || ''}</td>
      </tr>`; }

  on($('#btnApplyFilters'), 'click', applyFilters);
  on($('#btnClearFilters'), 'click', () => { ['#filterStatus','#filterDateFrom','#filterDateTo'].forEach(sel => { const el=$(sel); if (el) el.value=''; }); applyFilters(); });
  on($('#selectAll'), 'change', (e) => { const onOff = e.currentTarget.checked; $$('#adminReportTable tbody .row-check').forEach(cb => (cb.checked = onOff)); });
  on(tbody, 'change', (e) => { if (!e.target.matches('.row-check')) return; const all = $$('#adminReportTable tbody .row-check'); const selAll = $('#selectAll'); if (selAll) selAll.checked = (all.length && all.every(c => c.checked)); });
  applyFilters();
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
      <th class="cell-check"><input type="checkbox" id="selectAll"></th>
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

  // Load all rows
  const ALL = await api.getReports();

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

  // Export (uses API; falls back to client CSV/JSON)
  function toCSV(rows){
    const header = "id,date,species,time,location,status";
    const lines = rows.map(r => {
      const when = r.when || '';
      const date = when.slice(0,10);
      const time = when.slice(11);
      return [
        r.id ?? '',
        date,
        (r.species||'').replace(/,/g,' '),
        time,
        (r.where||'').replace(/,/g,' '),
        r.status || ''
      ].join(',');
    });
    return new Blob([ [header, ...lines].join("\n") ], { type:"text/csv" });
  }

  async function doExport(formatArg){
    const format = formatArg || document.getElementById('exportFormat')?.value || 'csv';
    const filters = readFilters();

    try {
      const res = await api.exportReports(format, filters);
      if (res && res.ok && res.url){
        const a = document.getElementById('downloadLink');
        a.href = res.url;
        a.download = res.filename || `reports.${format}`;
        a.style.display = '';
        a.click();
        setTimeout(() => URL.revokeObjectURL(res.url), 1500);
        return;
      }
    } catch(e){ /* fall through to client-side */ }

    // Fallback: export current preview
    const rows = applyFilters();
    let blob, filename;
    if (format === 'json'){
      blob = new Blob([ JSON.stringify(rows, null, 2) ], { type: 'application/json' });
      filename = 'reports.json';
    } else {
      blob = toCSV(rows);
      filename = 'reports.csv';
    }
    const url = URL.createObjectURL(blob);
    const a = document.getElementById('downloadLink');
    a.href = url; a.download = filename; a.style.display = '';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
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
(function boot(){
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
})();


