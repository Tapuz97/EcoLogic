// Vercel serverless function for public data (species, papers, shop)
import { getFirebaseAdmin } from './firebase-admin.js';

// DISABLE DATA - Set to false to disable this endpoint
const DATA_ENABLED = false;

// Initialize Firebase Admin
const { db } = getFirebaseAdmin();

export default async function handler(req, res) {
  // Early return if disabled
  if (!DATA_ENABLED) {
    return res.status(503).json({ error: 'Data service disabled' });
  }
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { type } = req.query;
    
    if (type === 'species') {
      // Get snail species
      const snapshot = await db.collection('snail_species').get();
      const species = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        species.push(data.scientific_name);
      });
      
      return res.json({ ok: true, species: species.sort() });
      
    } else if (type === 'papers') {
      // Get research papers
      const snapshot = await db.collection('papers').get();
      const papers = [];
      
      snapshot.forEach(doc => {
        papers.push({ id: doc.id, ...doc.data() });
      });
      
      return res.json({ ok: true, papers });
      
    } else if (type === 'shop') {
      // Get shop items
      const snapshot = await db.collection('shop').get();
      const items = [];
      
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      
      return res.json({ ok: true, items });
      
    } else {
      return res.status(400).json({ error: 'Invalid type. Use: species, papers, or shop' });
    }
    
  } catch (error) {
    console.error('Data API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}