// Report Export Parser - Handles report export functionality
// Fetches from /api/reports and processes export requests

// DISABLE REPORT_EXPORT_PARSER - Set to false to disable this endpoint
const REPORT_EXPORT_PARSER_ENABLED = true;

// In-memory cache for reports to avoid multiple fetches
let reportsCache = null;
let reportsLastFetched = null;

export default async function handler(req, res) {
  // Early return if disabled
  if (!REPORT_EXPORT_PARSER_ENABLED) {
    return res.status(503).json({ error: 'Report export parser service disabled' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Fetch reports from /api/reports (with caching to prevent quota exceeded)
    let reports = reportsCache;
    if (!reports || !reportsLastFetched || (Date.now() - new Date(reportsLastFetched).getTime()) > 300000) {
      // Cache miss or older than 5 minutes, fetch fresh data
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const apiUrl = `${proto}://${host}/api/reports?limit=10000`;
      console.log('report-export-parser: fetching reports from', apiUrl);
      const apiResp = await fetch(apiUrl);
      if (!apiResp.ok) {
        const text = await apiResp.text().catch(()=>'');
        throw new Error(`Failed to fetch reports from /api/reports: ${apiResp.status} ${text}`);
      }
      const apiJson = await apiResp.json();
      reports = Array.isArray(apiJson?.reports) ? apiJson.reports : [];
      reportsCache = reports;
      reportsLastFetched = new Date().toISOString();
      console.log('report-export-parser: fetched', Array.isArray(reports) ? reports.length : 0, 'reports (fresh)');
    } else {
      console.log('report-export-parser: using cached reports', Array.isArray(reports) ? reports.length : 0, 'reports (cached)');
    }

    // --- GET: Export endpoints ---
    if (req.method === 'GET') {
      const { format = 'csv', status, species, from, to } = req.query;
      
      // Apply filters
      let filteredReports = [...reports];
      if (status) filteredReports = filteredReports.filter(r => r.status === status);
      if (species) filteredReports = filteredReports.filter(r => r.species === species);
      if (from) filteredReports = filteredReports.filter(r => r.when && r.when.slice(0,10) >= from);
      if (to) filteredReports = filteredReports.filter(r => r.when && r.when.slice(0,10) <= to);
      
      console.log('report-export-parser: exporting', filteredReports.length, 'reports as', format);
      
      if (format === 'csv') {
        return exportAsCSV(res, filteredReports);
      } else if (format === 'json') {
        return exportAsJSON(res, filteredReports);
      } else if (format === 'xlsx') {
        return exportAsXLSX(res, filteredReports);
      } else {
        return res.status(400).json({ error: 'Unsupported format. Use csv, json, or xlsx' });
      }
    }

    // --- POST: Export with filters ---
    if (req.method === 'POST') {
      const { format = 'csv', filters = {} } = req.body;
      
      // Apply filters
      let filteredReports = [...reports];
      if (filters.status) filteredReports = filteredReports.filter(r => r.status === filters.status);
      if (filters.species) filteredReports = filteredReports.filter(r => r.species === filters.species);
      if (filters.from) filteredReports = filteredReports.filter(r => r.when && r.when.slice(0,10) >= filters.from);
      if (filters.to) filteredReports = filteredReports.filter(r => r.when && r.when.slice(0,10) <= filters.to);
      
      console.log('report-export-parser: exporting', filteredReports.length, 'reports as', format);
      
      if (format === 'csv') {
        return exportAsCSV(res, filteredReports);
      } else if (format === 'json') {
        return exportAsJSON(res, filteredReports);
      } else if (format === 'xlsx') {
        return exportAsXLSX(res, filteredReports);
      } else {
        return res.status(400).json({ error: 'Unsupported format. Use csv, json, or xlsx' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Report Export Parser Error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// --- Export Functions ---

function exportAsCSV(res, reports) {
  const headers = ['ID', 'Date', 'Time', 'Location', 'Species', 'Status', 'User ID', 'Coins'];
  const csvRows = [headers.join(',')];
  
  reports.forEach(report => {
    const when = report.when || '';
    const date = when.slice(0, 10);
    const time = when.slice(11);
    const row = [
      report.id || '',
      date,
      time,
      (report.where || '').replace(/,/g, ' '),
      (report.species || '').replace(/,/g, ' '),
      report.status || '',
      report.userId || '',
      report.coins || 0
    ];
    csvRows.push(row.join(','));
  });
  
  const csv = csvRows.join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="reports.csv"');
  return res.send(csv);
}

function exportAsJSON(res, reports) {
  const exportData = {
    exported_at: new Date().toISOString(),
    total_reports: reports.length,
    reports: reports.map(r => ({
      id: r.id,
      when: r.when,
      where: r.where,
      species: r.species,
      status: r.status,
      userId: r.userId,
      coins: r.coins
    }))
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="reports.json"');
  return res.json(exportData);
}

function exportAsXLSX(res, reports) {
  // For XLSX, we'll return JSON for now (would need xlsx library for real XLSX)
  // This is a placeholder - in production you'd use a library like 'xlsx'
  const exportData = {
    exported_at: new Date().toISOString(),
    total_reports: reports.length,
    reports: reports.map(r => ({
      ID: r.id,
      Date: r.when ? r.when.slice(0, 10) : '',
      Time: r.when ? r.when.slice(11) : '',
      Location: r.where,
      Species: r.species,
      Status: r.status,
      'User ID': r.userId,
      Coins: r.coins
    }))
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="reports.xlsx"');
  return res.json(exportData);
}
