// Live automata: 0 empty, 1 native, 2 invasive

(function () {
  const COLORS = { 1: "rgba(93, 255, 134, 0.71)", 2: "rgba(255, 93, 107, 0.78)" };

  const $ = (id) => document.getElementById(id);
  
  // Get card background color to match chart-card/automata-card
  function getCardBgColor() {
    // Check localStorage first (most reliable), then DOM
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' ||
                  document.documentElement.className.includes('theme-dark') ||
                  document.documentElement.getAttribute('data-theme') === 'dark' ||
                  document.documentElement.classList.contains('dark') ||
                  document.body.classList.contains('dark');
    
    // Match CSS --card variable colors
    return isDark ? '#121825' : '#ffffff';
  }
  
  // Get theme-appropriate grid color
  function getGridColor() {
    // Check localStorage first (most reliable), then DOM
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' ||
                  document.documentElement.className.includes('theme-dark') ||
                  document.documentElement.getAttribute('data-theme') === 'dark' ||
                  document.documentElement.classList.contains('dark') ||
                  document.body.classList.contains('dark');
    
    return isDark ? 'rgba(211, 211, 211, 0.4)' : 'rgba(211, 211, 211, 0.4)';
  }
  const canvas = $("automataCanvas");
  const statsEl = $("autoStats");

  const controls = {
    size: $("autoSize"),
    cell: $("autoCell"),
    alpha: $("alpha"),
    beta: $("beta"),
    gamma: $("gamma"),
    delta: $("delta"),
    start: $("autoStart"),
    step: $("autoStep"),
    reset: $("autoReset"),
  };

  let grid = null;
  let running = false;
  let gen = 0;
  let loopTimer = null;

  function clamp01(x) {
    x = Number(x) || 0;
    return Math.max(0, Math.min(1, x));
  }

  function params() {
    return {
      size: Number(controls.size.value) || 60,
      cell: Number(controls.cell.value) || 10,
      alpha: clamp01(controls.alpha.value),
      beta: clamp01(controls.beta.value),
      gamma: clamp01(controls.gamma.value),
      delta: clamp01(controls.delta.value),
    };
  }

  function createGrid(n) {
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const r = Math.random();
        g[y][x] = r < 0.06 ? 1 : r < 0.10 ? 2 : 0;
      }
    }
    return g;
  }

  function neighborCounts(g, x, y) {
    const n = g.length;
    let inv = 0, nat = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const xx = (x + dx + n) % n;
        const yy = (y + dy + n) % n;
        const v = g[yy][xx];
        if (v === 2) inv++;
        else if (v === 1) nat++;
      }
    }
    return { inv, nat };
  }

  function sampleState(emptyProb, natProb, invProb) {
    const total = emptyProb + natProb + invProb || 1;
    const r = Math.random() * total;
    if (r < emptyProb) return 0;
    if (r < emptyProb + natProb) return 1;
    return 2;
  }

  function evolve(g, p) {
    const n = g.length;
    const out = Array.from({ length: n }, () => Array(n).fill(0));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const s = g[y][x];
        const { inv, nat } = neighborCounts(g, x, y);
        const invFrac = inv / 8;
        const natFrac = nat / 8;

        if (s === 0) {
          const pInv = clamp01(p.alpha * invFrac);
          const pNat = clamp01(p.alpha * natFrac * (1 - invFrac));
          out[y][x] = sampleState(1 - (pInv + pNat), pNat, pInv);
        } else if (s === 1) {
          const dieFromInv = Math.random() < clamp01(p.beta * invFrac);
          if (dieFromInv) {
            out[y][x] = Math.random() < clamp01(p.gamma * invFrac) ? 2 : 0;
          } else {
            out[y][x] = 1;
          }
        } else {
          const dieFromNat = Math.random() < clamp01(p.delta * natFrac * 0.7);
          out[y][x] = dieFromNat ? 0 : 2;
        }
      }
    }
    return out;
  }

  function resizeCanvas(cell) {
    // Fixed 900x480 canvas size
    const w = 900, h = 480;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  function render() {
    if (!grid) return;
    const { cell } = params();
    resizeCanvas(cell);
    const n = grid.length;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = getCardBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const s = grid[y][x];
        if (s !== 0) {
          // Only draw species cells, skip empty cells for transparency
          ctx.fillStyle = COLORS[s] || "#0a111a";
          ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
        }
      }
    }

    ctx.strokeStyle = getGridColor();
    ctx.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell + 0.5, 0); ctx.lineTo(i * cell + 0.5, n * cell); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell + 0.5); ctx.lineTo(n * cell, i * cell + 0.5); ctx.stroke();
    }
  }

  function updateStats() {
    const { size } = params();
    statsEl.textContent = `Gen: ${gen} · Grid: ${size}²`;
  }

  function step() {
    if (!grid) return;
    grid = evolve(grid, params());
    gen += 1;
    render();
    updateStats();
  }

  function startLoop() {
    if (running) return;
    running = true;
    controls.start.textContent = "Pause";
    const tick = () => {
      if (!running) return;
      step();
      loopTimer = setTimeout(tick, 120);
    };
    loopTimer = setTimeout(tick, 120);
  }

  function stopLoop() {
    running = false;
    controls.start.textContent = "Start";
    if (loopTimer) clearTimeout(loopTimer);
    loopTimer = null;
  }

  function resetGrid() {
    const p = params();
    grid = createGrid(p.size);
    gen = 0;
    render();
    updateStats();
  }

  canvas.addEventListener("click", (e) => {
    if (!grid) return;
    const rect = canvas.getBoundingClientRect();
    const { cell } = params();
    const x = Math.floor((e.clientX - rect.left) / cell);
    const y = Math.floor((e.clientY - rect.top) / cell);
    if (grid[y] && typeof grid[y][x] !== "undefined") {
      grid[y][x] = (grid[y][x] + 1) % 3;
      render();
    }
  });

  controls.start.addEventListener("click", () => (running ? stopLoop() : startLoop()));
  controls.step.addEventListener("click", () => { if (!running) step(); });
  controls.reset.addEventListener("click", () => { stopLoop(); resetGrid(); });

  ["autoSize", "autoCell", "alpha", "beta", "gamma", "delta"].forEach((id) => {
    const el = document.getElementById(id);
    el && el.addEventListener("change", () => { stopLoop(); resetGrid(); });
  });

  // Listen for theme changes and re-render grid
  window.addEventListener('ecologic:theme-change', () => {
    if (grid) {
      render(); // Re-render with new grid color
    }
  });

  // Robust init: run immediately if DOM is already ready, otherwise on DOMContentLoaded
  function init() { resetGrid(); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();