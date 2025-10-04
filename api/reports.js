// Vercel serverless function for reports
import { getFirebaseAdmin } from './firebase-admin.js';

// Fake data toggle
const USE_FAKE_DATA = true;

// Generate fake reports data
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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = getFirebaseAdmin();

    if (req.method === 'GET') {
      // Get reports with filters
      const { status, species, limit = 50 } = req.query;
      
      let reports = [];
      
      if (USE_FAKE_DATA) {
        // Use fake data
        console.log('Reports: Using fake data');
        reports = generateFakeReports();
      } else {
        // Use real Firebase data
        let query = db.collection('reports');
        
        // Apply filters
        if (status === 'approved') {
          query = query.where('status', '==', true);
        } else if (status === 'denied') {
          query = query.where('status', '==', false);
        } else if (status === 'pending') {
          query = query.where('status', '==', null);
        }
        
        if (species) {
          query = query.where('species_name', '==', species);
        }
        
        // Remove the orderBy for now to get all data, then sort in memory
        query = query.limit(parseInt(limit));
        
        const snapshot = await query.get();
        
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
        
        // Sort in memory by date (newest first)
        reports.sort((a, b) => new Date(b.when) - new Date(a.when));
      }
      
      // Apply client-side filtering for fake data
      if (USE_FAKE_DATA) {
        if (status === 'approved') {
          reports = reports.filter(r => r.status === 'approved');
        } else if (status === 'denied') {
          reports = reports.filter(r => r.status === 'denied');
        } else if (status === 'pending') {
          reports = reports.filter(r => r.status === 'pending');
        }
        
        if (species) {
          reports = reports.filter(r => r.species === species);
        }
        
        // Apply limit
        reports = reports.slice(0, parseInt(limit));
      }
      
      return res.json({ ok: true, reports });
      
    } else if (req.method === 'POST') {
      // Submit new report
      const { species, location, site, description, image_url, userId } = req.body;
      
      if (!userId || !species) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
      }
      
      const report = {
        u_id: userId,
        species_name: species,
        location: location || {},
        site: site || 'User reported',
        name: `Snail observation – ${site || 'User location'}`,
        description: description || '',
        image_url: image_url || '',
        status: null, // pending review
        coins: 0,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const docRef = await db.collection('reports').add(report);
      return res.json({ ok: true, id: docRef.id });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}