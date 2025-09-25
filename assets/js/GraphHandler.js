// GraphHandler.js — lightweight Chart.js helper to render a fake demo chart
// This file intentionally does not modify AdminApp.js. It looks for
// a canvas with id `analyticsChart` and a select `#chartType` to toggle
// between line and bar. If Chart.js is not loaded, it gracefully does nothing.

const GraphHandler = (function(){
  let chart = null;

  function hasChartJs(){ return typeof Chart !== 'undefined'; }

  // generate labels for the last N months (short month names)
  function lastNMonthsLabels(n=8){
    const out = [];
    const dt = new Date();
    for (let i = n-1; i >= 0; i--){
      const d = new Date(dt.getFullYear(), dt.getMonth() - i, 1);
      out.push(d.toLocaleString(undefined, { month: 'short', year: 'numeric' }));
    }
    return out;
  }

  // simple deterministic pseudo-random generator for demo repeatability
  function seededRand(seed){
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => s = (s * 16807) % 2147483647;
  }

  function demoSeries(name, n, offset){
    const rnd = seededRand(name.length + (offset||0));
    const vals = [];
    for (let i=0;i<n;i++){
      // scale pseudo-random into 5..30 range
      vals.push(5 + (rnd() % 26));
    }
    return { label: name, data: vals };
  }

  function color(i, a=0.9){
    return `hsl(${(i*67)%360} 80% 45% / ${a})`;
  }

  function buildDatasets(labels){
    // Two demo species
    const s1 = demoSeries('Green Toad', labels.length, 10);
    const s2 = demoSeries('Blue Crab',  labels.length, 20);
    const datasets = [s1, s2].map((s, i) => ({
      label: s.label,
      data: s.data,
      borderColor: color(i, 1),
      backgroundColor: color(i, 0.25),
      fill: false,
      tension: 0.3,
      borderWidth: 2
    }));
    return datasets;
  }

  function createOrUpdateChart(type = 'line'){
    const canvas = document.getElementById('analyticsChart');
    if (!canvas) return;
    if (!hasChartJs()) return;

    const labels = lastNMonthsLabels(8);
    const datasets = buildDatasets(labels);

    const cfg = {
      type: type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: { ticks: { color: getComputedStyle(document.body).color } },
          y: { beginAtZero: true, ticks: { color: getComputedStyle(document.body).color } }
        }
      }
    };

    if (chart){
      // update existing chart in-place to preserve animation
      chart.config.type = cfg.type;
      chart.data = cfg.data;
      chart.options = cfg.options;
      chart.update();
    } else {
      chart = new Chart(canvas.getContext('2d'), cfg);
    }
  }

  function init(){
    if (!hasChartJs()) return;
    const chartTypeEl = document.getElementById('chartType');
    // if chartType exists, wire change
    if (chartTypeEl){
      chartTypeEl.addEventListener('change', () => createOrUpdateChart(chartTypeEl.value || 'line'));
    }
    // initial render
    createOrUpdateChart(chartTypeEl?.value || 'line');
  }

  // expose a safe init function
  return { init, createOrUpdateChart };
})();

// auto-run when loaded as a module (defer handles DOM ready)
try { GraphHandler.init(); } catch(e) { console.debug('GraphHandler init skipped', e); }

export default GraphHandler;
