// ThemeToggle.js — image-based sun/moon, path-safe across root/User/Admin
(function(){
  const STORAGE_KEY = "ecologic-theme";
  const link = document.getElementById("theme-css");
  if (!link) return; // requires <link id="theme-css" href="...style_light.css">

  const getThemeFromHref = () => /dark/i.test(link.getAttribute("href") || "") ? "dark" : "light";
  const setHtmlDataTheme = (t) => document.documentElement.setAttribute("data-theme", t);

  // Resolve ./IconPack/ vs ../IconPack/ by mirroring the stylesheet's path
function iconBase(){
  // All icons are now under assets/icons/
  // CSS is in assets/css/, so go up one level and into icons
  const href = link.getAttribute("href") || "./";
  const dir  = href.slice(0, href.lastIndexOf("/") + 1) || "./";
  return dir + "../icons/";
}


  function swapTheme(target){
    const href = link.getAttribute("href") || "";
    const next = href.replace(/style_(light|dark)\.css/i, `style_${target}.css`);
    if (next !== href) link.setAttribute("href", next);

    localStorage.setItem(STORAGE_KEY, target);
    setHtmlDataTheme(target);

    window.dispatchEvent(new CustomEvent("ecologic:theme-change", { detail: { theme: target }}));
    updateToggle(target);
  }

  function ensureToggle(){
    let btn = document.querySelector(".theme-toggle");
    if (!btn){
      btn = document.createElement("button");
      btn.className = "theme-toggle";
      btn.type = "button";
      document.body.appendChild(btn);
      btn.addEventListener("click", () => {
        const next = getThemeFromHref() === "dark" ? "light" : "dark";
        swapTheme(next);
      });
    }
    return btn;
  }

  function updateToggle(theme){
    const btn = ensureToggle();

    // If the button contains the pill markup (knob/icons), don't replace innerHTML
    const hasPill = !!btn.querySelector('.theme-toggle__knob');

    // ARIA/title reflect the semantic meaning
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = theme === 'dark' ? 'Light mode' : 'Dark mode';

    // set pressed state so CSS can move the knob
    btn.setAttribute('aria-pressed', String(theme === 'dark'));

    if (!hasPill) {
      // fallback: if there is no pill markup, render a simple icon (image or emoji)
      const base = iconBase();
      const src  = base + (theme === 'dark' ? 'sun.svg' : 'moon.svg');
      btn.innerHTML = '';
      const img = new Image();
      img.width = 20; img.height = 20; img.alt = '';
      img.onload  = () => { btn.innerHTML = ''; btn.appendChild(img); };
      img.onerror = () => { btn.textContent = (theme === 'dark' ? '☀︎' : '☾'); };
      img.src = src;
    }
    else {
      // If pill exists, ensure the moon/sun icons are actual images (not ascii)
      try {
        const base = iconBase();
        const moonSrc = base + 'moon.svg';
        const sunSrc  = base + 'sun.svg';

        const moonEl = btn.querySelector('.theme-toggle__moon');
        const sunEl  = btn.querySelector('.theme-toggle__sun');

        function replaceWithImg(el, src) {
          if (!el) return;
          // if it's already an <img>, just update src
          if (el.tagName && el.tagName.toLowerCase() === 'img') { el.src = src; return; }
          const img = document.createElement('img');
          img.className = el.className;
          img.alt = '';
          img.width = 18; img.height = 18;
          img.src = src;
          el.replaceWith(img);
        }

        replaceWithImg(moonEl, moonSrc);
        replaceWithImg(sunEl, sunSrc);
      } catch (e) { /* non-fatal */ }
    }
  }

  (function setupThemeToggle(){
  const link = document.getElementById('theme-css');
  if (!link) return;

  // remove any previous toggles to avoid dupes during hot-reload
  document.querySelectorAll('.theme-toggle').forEach(n => n.remove());

  // create pill
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.id = 'themeToggle';
  btn.setAttribute('type','button');
  btn.setAttribute('aria-pressed','false');
  btn.innerHTML = `
    <span class="theme-toggle__icon theme-toggle__moon" aria-hidden="true">☾</span>
    <span class="theme-toggle__icon theme-toggle__sun"  aria-hidden="true">☼</span>
    <span class="theme-toggle__knob" aria-hidden="true"></span>
    <span class="sr-only">Toggle dark mode</span>
  `;

  const isDark = () => /style_dark\.css/i.test(link.href);
  const reflect = () => btn.setAttribute('aria-pressed', String(isDark()));

  btn.addEventListener('click', () => {
    // delegate to swapTheme so we persist preference and notify listeners
    const next = isDark() ? 'light' : 'dark';
    swapTheme(next);
  });

  // mount logic: inline on Profile, floating elsewhere
  const page = document.body?.dataset?.page || '';
  if (page === 'profile') {
    // try to find the Settings header right-side container
    // preferred: the .recent-head within the Settings card
    const mount =
      document.querySelector('section[aria-labelledby="settings-title"] .recent-head') ||
      document.querySelector('.recent-head') ||
      document.body;

    btn.classList.add('theme-toggle--inline');
    mount.appendChild(btn);
  } else {
    document.body.appendChild(btn); // floating pill (fixed bottom-right)
  }

  reflect();
  window.addEventListener('ecologic:theme-change', reflect);
})();

// expose a simple API to toggle programmatically
window.ThemeToggle = window.ThemeToggle || {};
window.ThemeToggle.toggle = function(){
  const link = document.getElementById('theme-css');
  if (!link) return;
  const current = /style_dark\.css/i.test(link.href) ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  // swapTheme is in scope above; call it via indirect reference
  try { swapTheme(next); } catch(e) { 
    // fallback if swapTheme not accessible
    link.href = link.href.replace(current === 'dark' ? 'style_dark.css' : 'style_light.css', current === 'dark' ? 'style_light.css' : 'style_dark.css');
    window.dispatchEvent(new CustomEvent('ecologic:theme-change'));
  }
};


  // Apply saved preference early (prevents flash)
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== getThemeFromHref()){
      const href = link.getAttribute("href");
      link.setAttribute("href", href.replace(/style_(light|dark)\.css/i, `style_${saved}.css`));
      setHtmlDataTheme(saved);
    } else {
      setHtmlDataTheme(getThemeFromHref());
    }
  } catch (e) {}

  // Initialize when DOM is ready
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => updateToggle(getThemeFromHref()));
  } else {
    updateToggle(getThemeFromHref());
  }
})();

