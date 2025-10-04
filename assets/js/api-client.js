// Client-side API wrapper for Vercel serverless functions
// Uses Firebase Auth on client + Vercel API endpoints

import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import app, { auth } from './firebase-config.js';

// API base URL
const API_BASE = '/api';

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  
  const response = await fetch(url, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API call failed');
  }
  
  return data;
}

// Authentication API
export const authAPI = {
  // Login user
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      // Verify with our API
      const result = await apiCall('/auth', {
        method: 'POST',
        body: { action: 'verify', idToken }
      });
      
      return result;
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  // Register new user
  async register(email, password, name) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user in our database via API
      await apiCall('/user', {
        method: 'POST',
        body: {
          action: 'create',
          userId: user.uid,
          email: user.email,
          name: name
        }
      });
      
      return {
        ok: true,
        user: {
          id: user.uid,
          email: user.email,
          name: name,
          coins: 0
        }
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  // Logout user
  async logout() {
    try {
      await signOut(auth);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
};

// Reports API
export const reportsAPI = {
  // Get reports with filtering
  async getReports(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.species) params.append('species', filters.species);
      if (filters.limit) params.append('limit', filters.limit);
      
      const result = await apiCall(`/reports?${params}`);
      return result.reports || [];
    } catch (error) {
      console.error('Error getting reports:', error);
      return [];
    }
  },

  // Submit new report (without image for now)
  async submitReport(reportData) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const result = await apiCall('/reports', {
        method: 'POST',
        body: {
          species: reportData.species,
          location: reportData.location,
          site: reportData.site,
          description: reportData.description,
          userId: user.uid
        }
      });
      
      return result;
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
};

// User API
export const userAPI = {
  // Get user wallet
  async getWallet() {
    try {
      const user = auth.currentUser;
      if (!user) return { coins: 0 };
      
      const result = await apiCall(`/user?action=wallet&userId=${user.uid}`);
      return result;
    } catch (error) {
      console.error('Error getting wallet:', error);
      return { coins: 0 };
    }
  },

  // Get recent reports for user
  async getRecentReports() {
    try {
      const user = auth.currentUser;
      if (!user) return [];
      
      const result = await apiCall(`/user?action=reports&userId=${user.uid}`);
      return result.reports || [];
    } catch (error) {
      console.error('Error getting recent reports:', error);
      return [];
    }
  },

  // Get user profile
  async getProfile() {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      
      const result = await apiCall(`/user?action=profile&userId=${user.uid}`);
      return result;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }
};

// Stats API
export const statsAPI = {
  // Get dashboard stats
  async getStats() {
    try {
      const result = await apiCall('/admin?action=stats');
      return result;
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        reportsToday: 0,
        approvalRate: '0%',
        activeUsers: 0
      };
    }
  }
};

// Species API
export const speciesAPI = {
  // Get all species
  async getSpecies() {
    try {
      const result = await apiCall('/data?type=species');
      return result;
    } catch (error) {
      console.error('Error getting species:', error);
      return { ok: true, species: [] };
    }
  }
};

// Admin API
export const adminAPI = {
  // Approve report
  async approveReport(reportId, coins = 10) {
    try {
      const result = await apiCall('/admin', {
        method: 'POST',
        body: {
          action: 'approve',
          reportId: reportId,
          coins: coins
        }
      });
      return result;
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  // Deny report
  async denyReport(reportId) {
    try {
      const result = await apiCall('/admin', {
        method: 'POST',
        body: {
          action: 'deny',
          reportId: reportId
        }
      });
      return result;
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
};