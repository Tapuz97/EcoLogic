// Debug endpoint to check environment variables and Firebase status
// DISABLE DEBUG - Set to false to disable this endpoint
const DEBUG_ENABLED = false;

export default async function handler(req, res) {
  // Early return if disabled
  if (!DEBUG_ENABLED) {
    return res.status(503).json({ error: 'Debug service disabled' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const envStatus = {
      nodeEnv: process.env.NODE_ENV,
      hasFirebaseServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      serviceAccountKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length : 0,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('FIREBASE')),
      timestamp: new Date().toISOString()
    };

    // Try to initialize Firebase Admin to see exact error
    let firebaseStatus = 'not_tested';
    let firebaseError = null;

    try {
      const { getFirebaseAdmin } = await import('../firebase-admin.js');
      const { db } = getFirebaseAdmin();
      
      // Try a simple Firebase operation
      const testQuery = await db.collection('reports').limit(1).get();
      firebaseStatus = 'success';
      
    } catch (error) {
      firebaseStatus = 'error';
      firebaseError = {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack trace
      };
    }

    return res.json({
      ok: true,
      environment: envStatus,
      firebase: {
        status: firebaseStatus,
        error: firebaseError
      }
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    });
  }
}