// Firebase Cloud Functions API
import { onRequest } from 'firebase-functions/v2/https';
import { getFirebaseAdmin } from './firebase-admin.js';

// DISABLE INDEX - Set to false to disable this endpoint
const INDEX_ENABLED = false;

// Initialize Firebase Admin
const { db, auth } = getFirebaseAdmin();

// Cors middleware
const cors = (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  next();
};

// Auth middleware
const authenticateUser = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }
  
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await auth.verifyIdToken(token);
  return decodedToken;
};

// API: Get reports
export const getReports = onRequest(async (req, res) => {
  // Early return if disabled
  if (!INDEX_ENABLED) {
    return res.status(503).json({ error: 'Index service disabled' });
  }
  
  cors(req, res, async () => {
    try {
      // Authenticate user
      await authenticateUser(req);
      
      const { status, species, limit = 50 } = req.query;
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
      
      query = query.orderBy('created_at', 'desc').limit(parseInt(limit));
      
      const snapshot = await query.get();
      const reports = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          when: data.created_at ? data.created_at.toDate().toISOString() : '',
          where: data.site || 'Unknown',
          species: data.species_name || 'Unknown',
          status: data.status === true ? 'approved' : data.status === false ? 'denied' : 'pending',
          coins: data.coins || 0,
          userId: data.u_id || 'anonymous'
        });
      });
      
      res.json({ reports });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// API: Submit report
export const submitReport = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const user = await authenticateUser(req);
      const { species, location, site, description, image_url } = req.body;
      
      const report = {
        u_id: user.uid,
        species_name: species,
        location: location,
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
      res.json({ ok: true, id: docRef.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// API: Get species (public)
export const getSpecies = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const snapshot = await db.collection('snail_species').get();
      const species = [];
      
      snapshot.forEach(doc => {
        species.push(doc.data());
      });
      
      res.json({ species });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// API: Get user profile
export const getUserProfile = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const user = await authenticateUser(req);
      
      const userQuery = await db.collection('users').where('uid', '==', user.uid).get();
      
      if (userQuery.empty) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userQuery.docs[0].data();
      res.json({
        id: user.uid,
        email: user.email,
        name: userData.name || 'User',
        coins: userData.coins || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});