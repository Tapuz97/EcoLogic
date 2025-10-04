// Dashboard Parser - Computes admin dashboard statistics from reports
// Fetches from /api/reports and posts computed data to /api/dashboard

import { getFirebaseAdmin } from './firebase-admin.js';

// DISABLE DASHBOARD-PARSER - Set to false to disable this endpoint
const DASHBOARD_PARSER_ENABLED = true;

// Fake data toggle
const USE_FAKE_DATA = true;

// Generate fake reports data (same as in reports.js)
function generateFakeReports() {
  const sites = [
    'Ginosar', 'Gofra', 'Tiberias', 'Duga', 'Hamat', 'Kursi', 'Amnun', 'Hukok',
    'Moshavat Kinneret shore', 'Arik Bridge area', 'Majrase estuary', 'Ein Gev',
    'Jordan Park', 'Susita cliffs', 'Kadarim shore', 'Kfar Nahum', 'Zemach',
    'Kinar vicinity', 'Tabgha shore', 'Migdala shore'
  ];
  
  const species = [
    'Melanoides tuberculata', 'Thiara scabra', 'Melanopsis costata', 
    'Bithynia sp.', 'Theodoxus jordani', 'Unknown'
  ];
  
  const statuses = ['approved', 'denied', 'pending'];
  const userIds = ['user1', 'user2', 'user3', 'user4', 'user5', 'admin1', 'admin2'];
  
  const reports = [];
  const now = new Date();
  
  // Generate 100 fake reports
  for (let i = 0; i < 100; i++) {
    const daysAgo = Math.floor(Math.random() * 30); // Last 30 days
    const reportDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    const site = sites[Math.floor(Math.random() * sites.length)];
    const speciesName = species[Math.floor(Math.random() * species.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    
    // Generate realistic ID (24 character hex string)
    const id = Array.from({length: 24}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    reports.push({
      id: id,
      when: reportDate.toISOString().slice(0, 19).replace('T', ' '),
      where: site,
      species: speciesName,
      status: status,
      coins: status === 'approved' ? Math.floor(Math.random() * 10) + 1 : 0,
      userId: userId
    });
  }
  
  // Sort by date (newest first)
  reports.sort((a, b) => new Date(b.when) - new Date(a.when));
  
  return reports;
}

// In-memory cache for KPIs and latest list (single source for Admin)
let kpiCache = null;                // { reportsToday, approvalRate:'82%', activeUsers, totalReports }
let latestCache = { items: [] };    // { items: [{ id, where, when, species, status }] }
let lastUpdated = null;             // ISO string
let reportsCache = null;            // Cache for raw reports to avoid multiple fetches
let reportsLastFetched = null;      // When reports were last fetched
let isComputing = false;            // Prevent multiple simultaneous computations

// --- Main API Handler ---
export default async function handler(req, res) {
  // Early return if disabled
  if (!DASHBOARD_PARSER_ENABLED) {
    return res.status(503).json({ error: 'Dashboard-parser service disabled (use /api/dashboard instead)' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Fetch reports data (with caching to prevent quota exceeded)
    let reports = reportsCache;
    if (!reports || !reportsLastFetched || (Date.now() - new Date(reportsLastFetched).getTime()) > 300000) {
      // Cache miss or older than 5 minutes, fetch fresh data
      if (USE_FAKE_DATA) {
        // Use fake data
        console.log('dashboard-parser: Using fake data');
        reports = generateFakeReports();
      } else {
        // Use real Firebase data
        const { db } = getFirebaseAdmin();
        const snapshot = await db.collection('reports').limit(10000).get();
        reports = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          reports.push({
            id: doc.id,
            when: data.date || data.created_at ? 
              (data.date ? new Date(data.date).toISOString().slice(0, 19).replace('T', ' ') : 
               data.created_at.toDate().toISOString().slice(0, 19).replace('T', ' ')) : 
              '',
            where: data.site || data.name?.replace(/^(Snail observation|Auto report)\s*–\s*/, '') || 'Unknown',
            species: data.species_name || 'Unknown',
            status: data.status === true ? 'approved' : data.status === false ? 'denied' : 'pending',
            coins: data.coins || 0,
            userId: data.u_id || 'anonymous'
          });
        });
        
        // Sort by date (newest first)
        reports.sort((a, b) => new Date(b.when) - new Date(a.when));
      }
      
      reportsCache = reports;
      reportsLastFetched = new Date().toISOString();
      console.log('dashboard-parser: fetched', Array.isArray(reports) ? reports.length : 0, 'reports (fresh)');
    } else {
      console.log('dashboard-parser: using cached reports', Array.isArray(reports) ? reports.length : 0, 'reports (cached)');
    }

    // --- GET: Dashboard endpoints ---
    if (req.method === 'GET') {
      const { endpoint } = req.query;
      
      if (endpoint === 'dashboard_stats') {
        // Compute dashboard KPIs
        const kpis = getDashboardStats(reports);
        console.log('dashboard-parser: KPIs computed', kpis);
        // Update cache
        kpiCache = kpis;
        lastUpdated = new Date().toISOString();
        console.log('dashboard-parser: KPIs cached at', lastUpdated, kpiCache);
        // Data computed and cached
        return res.json({ ok: true, data: kpiCache, lastUpdated });
      }
      
      if (endpoint === 'latest_reports') {
        const latest = getLatestReports(reports);
        console.log('dashboard-parser: latest computed', latest.length, 'items');
        // Update cache
        latestCache = { items: latest.map(r => ({
          id: String(r.id || ''),
          where: String(r.where || ''),
          when: String(r.when || ''),
          species: String(r.species || ''),
          status: String(r.status || 'pending')
        })) };
        lastUpdated = new Date().toISOString();
        console.log('dashboard-parser: latest cached at', lastUpdated, 'items:', latestCache.items.length);
        // Data computed and cached
        return res.json({ ok: true, data: { items: latestCache.items.slice(0, 10) }, lastUpdated });
      }
      
      // Default: API info
      return res.json({
        ok: true,
        message: 'Dashboard parser ready',
        totalReports: reports.length,
        endpoints: [
          '/api/dashboard-parser?endpoint=dashboard_stats',
          '/api/dashboard-parser?endpoint=latest_reports'
        ]
      });
    }

    // No POST endpoints - this parser only computes and posts to dashboard

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Data Parser Error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// --- Dashboard Stats ---
function getDashboardStats(reports) {
  // Reports today
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const reportsToday = reports.filter(r => {
    if (!r.when) return false;
    const d = new Date(r.when); return d >= today;
  }).length;

  // Approval rate over ALL reports (approved / total including pending)
  const totalAll = reports.length;
  const approvedAll = reports.filter(r => r.status === 'approved').length;
  const approvalRate = totalAll > 0 ? Math.round((approvedAll / totalAll) * 100) + '%' : '0%';

  // Active users: unique userId across ALL reports
  const activeUsers = new Set(reports.map(r => r.userId).filter(Boolean)).size;

  return {
    reportsToday,
    approvalRate,
    activeUsers,
    totalReports: totalAll
  };
}

// --- Latest Reports ---
function getLatestReports(reports) {
  // Return ALL reports sorted by newest first
  return [...reports].sort((a, b) => new Date(b.when) - new Date(a.when));
}

// --- Helper Functions ---

// Helper functions removed - no longer needed