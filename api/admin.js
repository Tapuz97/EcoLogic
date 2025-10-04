// Vercel serverless function for admin operations
import { getFirebaseAdmin } from './firebase-admin.js';

// DISABLE ADMIN - Set to false to disable this endpoint
const ADMIN_ENABLED = false;

// Initialize Firebase Admin
const { db } = getFirebaseAdmin();

export default async function handler(req, res) {
  // Early return if disabled
  if (!ADMIN_ENABLED) {
    return res.status(503).json({ error: 'Admin service disabled' });
  }
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    if (req.method === 'GET') {
      const { action } = req.query;
      
      if (action === 'stats') {
        // Get dashboard stats
        const [reportsSnapshot, usersSnapshot] = await Promise.all([
          db.collection('reports').get(),
          db.collection('users').get()
        ]);
        
        const reports = [];
        reportsSnapshot.forEach(doc => {
          reports.push(doc.data());
        });
        
        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const reportsToday = reports.filter(r => {
          if (!r.created_at) return false;
          const reportDate = r.created_at.toDate();
          return reportDate >= today;
        }).length;
        
        const approvedReports = reports.filter(r => r.status === true).length;
        const totalReports = reports.length;
        const approvalRate = totalReports > 0 ? Math.round((approvedReports / totalReports) * 100) + '%' : '0%';
        
        return res.json({
          reportsToday,
          approvalRate,
          activeUsers: usersSnapshot.size,
          totalReports
        });
        
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
    } else if (req.method === 'POST') {
      const { action, reportId, status, coins } = req.body;
      
      if (action === 'approve' && reportId) {
        // Approve report
        await db.collection('reports').doc(reportId).update({
          status: true,
          coins: coins || 10,
          updated_at: new Date()
        });
        
        return res.json({ ok: true, message: 'Report approved' });
        
      } else if (action === 'deny' && reportId) {
        // Deny report
        await db.collection('reports').doc(reportId).update({
          status: false,
          coins: 0,
          updated_at: new Date()
        });
        
        return res.json({ ok: true, message: 'Report denied' });
        
      } else {
        return res.status(400).json({ error: 'Invalid action or missing data' });
      }
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Admin API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}