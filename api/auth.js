// Vercel serverless function for authentication
import { getFirebaseAdmin } from './firebase-admin.js';

// DISABLE AUTH - Set to false to disable this endpoint
const AUTH_ENABLED = false;

// Initialize Firebase Admin
const { auth, db } = getFirebaseAdmin();

export default async function handler(req, res) {
  // Early return if disabled
  if (!AUTH_ENABLED) {
    return res.status(503).json({ error: 'Authentication service disabled' });
  }
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { action, email, password, name, idToken } = req.body;
    
    if (action === 'register') {
      // Create user with Firebase Auth
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: name
      });
      
      // Create user document in Firestore
      await db.collection('users').add({
        uid: userRecord.uid,
        email: userRecord.email,
        name: name || 'User',
        coins: 0,
        createdAt: new Date()
      });
      
      return res.json({
        ok: true,
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          name: name,
          coins: 0
        }
      });
      
    } else if (action === 'verify') {
      // Verify ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      
      // Get user data from Firestore
      const userQuery = await db.collection('users').where('uid', '==', decodedToken.uid).get();
      let userData = { name: 'User', coins: 0 };
      
      if (!userQuery.empty) {
        userData = userQuery.docs[0].data();
      }
      
      return res.json({
        ok: true,
        user: {
          id: decodedToken.uid,
          email: decodedToken.email,
          name: userData.name || 'User',
          coins: userData.coins || 0
        }
      });
      
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
  } catch (error) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}