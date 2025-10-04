// Firebase Admin SDK configuration for server-side operations
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Singleton Firebase Admin instance
let app = null;
let db = null;
let auth = null;

// Initialize Firebase Admin (only once)
export function initializeFirebaseAdmin() {
  if (app) {
    return { app, db, auth };
  }

  try {
    // Check if already initialized
    if (getApps().length === 0) {
      const projectId = (process.env.FIREBASE_PROJECT_ID || "eco-logic-734cd").trim();
      
      // Try to use environment variables (production)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log('🔑 Using Firebase service account JSON key');
        console.log('🔍 Service account key length:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length);
        
        try {
          // Parse the service account JSON
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          console.log('📧 Client email:', serviceAccount.client_email);
          console.log('🔢 Project ID:', serviceAccount.project_id);
          console.log('🔐 Private key ID:', serviceAccount.private_key_id);
          console.log('🔐 Private key preview:', serviceAccount.private_key.substring(0, 50) + '...');

          app = initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id
          });
          
          console.log('🎯 Firebase app initialized with JSON service account');
          console.log('🔍 App name:', app.name);
          console.log('🔍 App options:', app.options.projectId);
          
        } catch (jsonError) {
          console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', jsonError.message);
          throw jsonError;
        }
        
      } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        console.log('🔑 Using Firebase service account credentials (fallback)');
        console.log('📧 Client email:', process.env.FIREBASE_CLIENT_EMAIL.trim());
        console.log('🔢 Project ID:', projectId);
        console.log('🔐 Private key preview:', process.env.FIREBASE_PRIVATE_KEY.substring(0, 50) + '...');
        
        // Fix private key formatting - handle both escaped and unescaped newlines
        let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();
        
        // Remove surrounding quotes if present
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.slice(1, -1);
        }
        if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
          privateKey = privateKey.slice(1, -1);
        }
        
        // Handle escaped newlines
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }
        
        // Ensure proper formatting
        if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
          console.error('❌ Private key does not start with proper header');
        }
        if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
          console.error('❌ Private key does not end with proper footer');
        }
        
        console.log('🔐 Private key length:', privateKey.length);
        console.log('🔐 Private key starts with:', privateKey.substring(0, 30) + '...');
        console.log('🔐 Private key ends with:', '...' + privateKey.substring(privateKey.length - 30));
        
        // Clean up other environment variables
        const privateKeyId = (process.env.FIREBASE_PRIVATE_KEY_ID || "").trim();
        const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
        const clientId = (process.env.FIREBASE_CLIENT_ID || "").trim();

        const serviceAccount = {
          type: "service_account",
          project_id: projectId,
          private_key_id: privateKeyId,
          private_key: privateKey,
          client_email: clientEmail,
          client_id: clientId,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${clientEmail}`
        };

        // Validate service account
        console.log('🔍 Service account validation:');
        console.log('   Project ID:', serviceAccount.project_id);
        console.log('   Client email:', serviceAccount.client_email);
        console.log('   Private key ID:', serviceAccount.private_key_id);
        console.log('   Private key valid format:', serviceAccount.private_key.includes('BEGIN PRIVATE KEY'));

        app = initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId
        });
        
        console.log('🎯 Firebase app initialized with explicit credentials');
      } else {
        // For local development - try default credentials
        console.log('🏠 Attempting local development mode');
        try {
          app = initializeApp({
            projectId: projectId
          });
        } catch (localError) {
          console.warn('⚠️ Firebase Admin credentials not configured for local development');
          console.log('💡 For local testing, you can:');
          console.log('  1. Use Firebase emulators');
          console.log('  2. Set up service account credentials');
          console.log('  3. Deploy to Vercel for full testing');
          
          // Return mock services for local development
          return createMockServices();
        }
      }
    } else {
      app = getApps()[0];
    }

    // Initialize services
    db = getFirestore(app);
    auth = getAuth(app);

    console.log('✅ Firebase Admin initialized successfully');
    return { app, db, auth };

  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    console.error('🔍 Error details:', {
      code: error.code,
      message: error.message,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('🔄 Falling back to mock services for local development');
    return createMockServices();
  }
}

// Create mock services for local development when Firebase is not available
function createMockServices() {
  const mockDb = {
    collection: (name) => ({
      get: () => Promise.resolve({ docs: [], forEach: () => {} }),
      add: (data) => Promise.resolve({ id: 'mock-id-' + Date.now() }),
      doc: (id) => ({
        get: () => Promise.resolve({ exists: false, data: () => null }),
        set: (data) => Promise.resolve(),
        update: (data) => Promise.resolve()
      }),
      where: () => mockDb.collection(name),
      orderBy: () => mockDb.collection(name),
      limit: () => mockDb.collection(name)
    })
  };

  const mockAuth = {
    createUser: (data) => Promise.resolve({ uid: 'mock-user-' + Date.now() }),
    getUserByEmail: (email) => Promise.resolve({ uid: 'mock-user', email }),
    verifyIdToken: (token) => Promise.resolve({ uid: 'mock-user' })
  };

  console.log('🎭 Using mock Firebase services for local development');
  
  return {
    app: null,
    db: mockDb,
    auth: mockAuth
  };
}

// Export initialized instances
export function getFirebaseAdmin() {
  if (!app && !db) {
    return initializeFirebaseAdmin();
  }
  return { app, db, auth };
}

// Convenience exports
export { db, auth, app };