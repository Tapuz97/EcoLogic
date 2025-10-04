// --- Export helpers (table -> rows, rows -> CSV/JSON, download) ---
function tableRowsToObjects(tableId = 'adminReportTable'){
  const rows = [];
  const trs = document.querySelectorAll(`#${tableId} tbody tr`);
  trs.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (!tds.length) return;
    // columns: [0]=checkbox, [1]=ID, [2]=Date, [3]=Species, [4]=Time, [5]=Location, [6]=Status
    rows.push({
      id:       (tds[1]?.textContent || '').trim(),
      date:     (tds[2]?.textContent || '').trim(),
      species:  (tds[3]?.textContent || '').trim(),
      time:     (tds[4]?.textContent || '').trim(),
      location: (tds[5]?.textContent || '').trim(),
      status:   (tds[6]?.textContent || '').trim()
    });
  });
  return rows;
}

function rowsToCSV(rows){
  const header = 'id,date,species,time,location,status';
  const esc = v => String(v).replace(/"/g,'""'); // CSV escape
  const lines = rows.map(r =>
    [r.id, r.date, r.species, r.time, r.location, r.status]
      .map(v => /[",\n]/.test(v) ? `"${esc(v)}"` : v)
      .join(',')
  );
  return [header, ...lines].join('\n');
}

function downloadBlob(filename, blob){
  const url = URL.createObjectURL(blob);
  const a = document.getElementById('downloadLink') || document.createElement('a');
  a.href = url; a.download = filename; a.style.display = '';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// --- Global namespace for inline onclicks ---
window.Export = {
  exportCSV(){
    const rows = tableRowsToObjects();
    if (!rows.length) { alert('No rows to export'); return; }
    const blob = new Blob([ rowsToCSV(rows) ], { type: 'text/csv;charset=utf-8' });
    downloadBlob('reports.csv', blob);
  },
  exportJSON(){
    const rows = tableRowsToObjects();
    if (!rows.length) { alert('No rows to export'); return; }
    const blob = new Blob([ JSON.stringify(rows, null, 2) ], { type: 'application/json' });
    downloadBlob('reports.json', blob);
  },
  exportXLSX(){
    // Simple/compatible: ship CSV content with .xlsx filename.
    // (Plenty of tools open it; real XLSX can come later server-side.)
    const rows = tableRowsToObjects();
    if (!rows.length) { alert('No rows to export'); return; }
    const blob = new Blob([ rowsToCSV(rows) ], { type: 'text/csv;charset=utf-8' });
    downloadBlob('reports.xlsx', blob);
  }
};

// Attach button handlers (safe on DOM ready)
function attachExportButtons(){
  try{
    const csv = document.getElementById('btnExportCSV');
    const xlsx = document.getElementById('btnExportXLSX');
    const json = document.getElementById('btnExportJSON');
    if (csv) csv.addEventListener('click', () => window.Export.exportCSV());
    if (xlsx) xlsx.addEventListener('click', () => window.Export.exportXLSX());
    if (json) json.addEventListener('click', () => window.Export.exportJSON());
  }catch(e){ console.error('attachExportButtons error', e); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachExportButtons);
else attachExportButtons();
