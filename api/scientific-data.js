// Scientific Data API - Serves data from Firebase collections for analytics
// Similar to reports.js but for scientific data collections

import { getFirebaseAdmin } from './firebase-admin.js';

// DISABLE SCIENTIFIC_DATA - Set to false to disable this endpoint
const SCIENTIFIC_DATA_ENABLED = true;

// USE_FAKE_DATA - Set to true to use generated fake data instead of Firebase
const USE_FAKE_DATA = true;

// Available scientific collections
const SCIENTIFIC_COLLECTIONS = [
  'snail_observations',
  'water_chemistry', 
  'probe_profiles',
  'snail_species',
  'cyanobacteria_microcystis_cylindrospermopsis',
  'cyanobacteria_aphanizomenon',
  'reports',
  'users',
  'photos',
  'papers',
  'shop',
  'user_report_history',
  'user_shop_history',
  'reports_orphans_backup',
  'export_summary'
];

// In-memory cache for JSON data
let dataCache = {};
let cacheLastFetched = {};

///////////////////////////////////////////////////////////// --- Fake Data Generation Functions --- /////////////////////////////////////////////////////////////

function generateFakeSnailObservations() {
  const sources = ['scientist', 'citizen', 'reports'];
  const species = ['Melanoides tuberculata', 'Thiara scabra', 'Melanopsis costata', 'Bithynia sp.', 'Theodoxus jordani', 'Unknown'];
  const sites = ['Ginosar', 'Gofra', 'Shittim', 'Hamei_Tveria', 'Hukok', 'Tiberias', 'Duga', 'Hamat', 'Kursi', 'Amnun', 'Moshavat Kinneret shore', 'Arik Bridge area', 'Majrase estuary', 'Ein Gev', 'Jordan Park', 'Susita cliffs', 'Kadarim shore', 'Kfar Nahum', 'Zemach', 'Kinar vicinity', 'Tabgha shore', 'Migdala shore'];
  const habitats = ['Rocky', 'Sandy', 'Muddy', 'Mixed'];
  const reportStatuses = ['approved', 'denied', 'pending'];
  
  // Site-specific density ranges for more realistic ANOVA Beach results
  const siteDensityRanges = {
    'Ginosar': [20, 60], 'Gofra': [15, 45], 'Shittim': [25, 55], 'Hamei_Tveria': [30, 70],
    'Hukok': [18, 50], 'Tiberias': [35, 75], 'Duga': [22, 52], 'Hamat': [28, 68],
    'Kursi': [20, 50], 'Amnun': [25, 55], 'Moshavat Kinneret shore': [15, 40],
    'Arik Bridge area': [12, 35], 'Majrase estuary': [18, 45], 'Ein Gev': [25, 60],
    'Jordan Park': [20, 45], 'Susita cliffs': [22, 50], 'Kadarim shore': [20, 48],
    'Kfar Nahum': [30, 65], 'Zemach': [25, 55], 'Kinar vicinity': [15, 35],
    'Tabgha shore': [20, 45], 'Migdala shore': [18, 42]
  };
  
  // Habitat-specific density ranges for more realistic ANOVA Habitat results
  const habitatDensityRanges = {
    'Rocky': [25, 60],      // High density - preferred habitat
    'Mixed': [15, 35],      // Medium-high density - varied habitat
    'Sandy': [5, 25],       // Low-medium density - less preferred
    'Muddy': [8, 20]        // Low density - least preferred
  };
  
  const observations = [];
  for (let i = 0; i < 500; i++) { // Increased sample size for better statistics
    const site = sites[Math.floor(Math.random() * sites.length)];
    const habitat = habitats[Math.floor(Math.random() * habitats.length)];
    
    // Use habitat-specific density ranges for more realistic ANOVA Habitat results
    const habitatDensityRange = habitatDensityRanges[habitat];
    let density = habitatDensityRange[0] + Math.random() * (habitatDensityRange[1] - habitatDensityRange[0]);
    
    // Add some noise and variation for more realistic regression data
    const noise = (Math.random() - 0.5) * 10; // ±5 density units of noise
    density = Math.max(0, density + noise); // Ensure non-negative
    
    // Create more spread-out coordinates for better kriging interpolation
    // Use a larger area around the Sea of Galilee region
    const baseLat = 32.7 + Math.random() * 0.4; // 32.7 to 33.1
    const baseLng = 35.5 + Math.random() * 0.3; // 35.5 to 35.8
    
    // Add some clustering around specific areas for more realistic patterns
    const clusterCenters = [
      [32.8, 35.6], [32.9, 35.7], [32.7, 35.5], [33.0, 35.6]
    ];
    const clusterCenter = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
    const finalLat = clusterCenter[0] + (Math.random() - 0.5) * 0.1;
    const finalLng = clusterCenter[1] + (Math.random() - 0.5) * 0.1;
    
    // Create more realistic species status distribution
    // 60% invasive, 40% native (realistic for this region)
    const speciesStatus = Math.random() < 0.6 ? 'invasive' : 'native';
    
    observations.push({
      id: `obs_${i}`,
      source: sources[Math.floor(Math.random() * sources.length)],
      species_name: species[Math.floor(Math.random() * species.length)],
      species_status: speciesStatus,
      site: site,
      habitat: habitat,
      depth_m: Math.random() * 10, // 0-10 meters
      density_per_m2: Math.round(density * 10) / 10, // Realistic density with 1 decimal
      status: reportStatuses[Math.floor(Math.random() * reportStatuses.length)],
      location: {
        coordinates: [finalLng, finalLat]
      },
      date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString()
    });
  }
  return observations;
}

function generateFakeWaterChemistry() {
  const stations = ['A', 'B', 'C', 'D'];
  const waterChem = [];
  
  for (let i = 0; i < 200; i++) { // Increased sample size for better regression
    const station = stations[Math.floor(Math.random() * stations.length)];
    
    // Create more realistic pH ranges per station for better regression
    const stationPhRanges = {
      'A': [7.2, 8.5], 'B': [7.0, 8.2], 'C': [7.5, 8.8], 'D': [7.1, 8.3]
    };
    const phRange = stationPhRanges[station];
    const avg_ph = phRange[0] + Math.random() * (phRange[1] - phRange[0]);
    
    waterChem.push({
      id: `wc_${i}`,
      station: station,
      date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
      avg_ph: Math.round(avg_ph * 100) / 100,
      avg_turbidity: Math.round((2 + Math.random() * 8) * 100) / 100,
      avg_cl: Math.round((50 + Math.random() * 100) * 100) / 100,
      avg_nitrate: Math.round((0.5 + Math.random() * 2) * 100) / 100,
      avg_nitrit: Math.round((0.1 + Math.random() * 0.5) * 100) / 100
    });
  }
  return waterChem;
}

function generateFakeSnailSpecies() {
  const species = [
    { scientific_name: 'Melanoides tuberculata', status: 'invasive', typical_size_mm: 15, habitats: ['Rocky', 'Mixed'], notes: 'Common invasive species' },
    { scientific_name: 'Thiara scabra', status: 'invasive', typical_size_mm: 12, habitats: ['Sandy', 'Mixed'], notes: 'Invasive freshwater snail' },
    { scientific_name: 'Melanopsis costata', status: 'native', typical_size_mm: 8, habitats: ['Rocky'], notes: 'Native species' },
    { scientific_name: 'Bithynia sp.', status: 'native', typical_size_mm: 6, habitats: ['Muddy', 'Mixed'], notes: 'Native genus' },
    { scientific_name: 'Theodoxus jordani', status: 'native', typical_size_mm: 10, habitats: ['Rocky', 'Mixed'], notes: 'Endemic to Jordan River' },
    { scientific_name: 'Unknown', status: 'unknown', typical_size_mm: 0, habitats: [], notes: 'Unidentified species' }
  ];
  
  return species.map((spec, index) => ({
    id: `species_${index}`,
    ...spec
  }));
}
///////////////////////////////////////////////////////////// --- ................................. --- /////////////////////////////////////////////////////////////

export default async function handler(req, res) {
  // Early return if disabled
  if (!SCIENTIFIC_DATA_ENABLED) {
    return res.status(503).json({ error: 'Scientific data service disabled' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { collection, limit = 10000 } = req.query;

    if (req.method === 'GET') {
      if (!collection) {
        return res.json({
          ok: true,
          message: 'Scientific data API ready',
          availableCollections: SCIENTIFIC_COLLECTIONS,
          usage: 'GET /api/scientific-data?collection=COLLECTION_NAME',
          specialEndpoints: [
            'GET /api/scientific-data?collection=analytics_data - Pre-processed data for analytics parser'
          ]
        });
      }

            // Special endpoint for analytics parser - returns only the 3 collections needed for analytics
            if (collection === 'analytics_data') {
              const analyticsData = await getAnalyticsData();
              return res.json({
                ok: true,
                collection: 'analytics_data',
                data: analyticsData,
                message: 'Pre-processed data for analytics parser (snail_observations, water_chemistry, snail_species only)'
              });
            }

      if (!SCIENTIFIC_COLLECTIONS.includes(collection)) {
        return res.status(404).json({ 
          ok: false, 
          error: `Collection '${collection}' not found`,
          availableCollections: SCIENTIFIC_COLLECTIONS
        });
      }

      // Get data from Firebase collection (with caching)
      const data = await getCollectionData(collection);
      
      // Apply limit
      const limitedData = data.slice(0, parseInt(limit));
      
      return res.json({ 
        ok: true, 
        collection,
        data: limitedData,
        total: data.length,
        returned: limitedData.length
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Scientific Data API Error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// --- Helper Functions ---

async function getAnalyticsData() {
  // Check cache first (1-hour cache to match analytics parser)
  const now = Date.now();
  const cacheKey = 'analytics_data';
  
  if (dataCache[cacheKey] && cacheLastFetched[cacheKey] && 
      (now - cacheLastFetched[cacheKey]) < 60 * 60 * 1000) {
    console.log('scientific-data: using cached analytics data (age:', Math.round((now - cacheLastFetched[cacheKey]) / 1000), 'seconds)');
    return dataCache[cacheKey];
  }

  console.log('scientific-data: cache miss - dataCache[cacheKey]:', !!dataCache[cacheKey], 'cacheLastFetched[cacheKey]:', !!cacheLastFetched[cacheKey]);
  if (cacheLastFetched[cacheKey]) {
    console.log('scientific-data: cache age:', Math.round((now - cacheLastFetched[cacheKey]) / 1000), 'seconds (max: 3600)');
  }

  console.log('scientific-data: fetching fresh analytics data', USE_FAKE_DATA ? '(using fake data)' : 'from Firebase');
  
  try {
    let analyticsData;
    
    if (USE_FAKE_DATA) {
      // Use fake data generation
      console.log('scientific-data: generating fake analytics data');
      analyticsData = {
        snailObservations: generateFakeSnailObservations(),
        waterChemistry: generateFakeWaterChemistry(),
        probeProfiles: [], // Not used in analytics
        snailSpecies: generateFakeSnailSpecies()
      };
    } else {
      // Fetch from Firebase - only the specific collections needed for analytics
      const { db } = getFirebaseAdmin();
      
      // Fetch only the 4 collections needed for analytics in parallel
      const [snailObs, waterChem, snailSpec] = await Promise.all([
        fetchCollectionFromFirebase(db, 'snail_observations'),
        fetchCollectionFromFirebase(db, 'water_chemistry'),
        fetchCollectionFromFirebase(db, 'snail_species')
      ]);

      // Pre-process the data for analytics
      analyticsData = {
        snailObservations: snailObs.map(obs => ({
          id: obs.id,
          source: obs.source || 'scientist',
          species_name: obs.species_name,
          species_status: obs.species_status,
          site: obs.site,
          habitat: obs.habitat,
          depth_m: obs.depth_m,
          density_per_m2: obs.density_per_m2,
          location: obs.location,
          date: obs.date,
          status: obs.status || 'approved' // Add status field for t-test
        })),
        
        waterChemistry: waterChem.map(wc => ({
          id: wc.id,
          station: wc.station,
          date: wc.date,
          avg_ph: wc.avg_ph,
          avg_turbidity: wc.avg_turbidity,
          avg_cl: wc.avg_cl,
          avg_nitrate: wc.avg_nitrate,
          avg_nitrit: wc.avg_nitrit
        })),
        
        probeProfiles: [], // Not used in analytics - empty array for consistency
        
        snailSpecies: snailSpec.map(spec => ({
          id: spec.id,
          scientific_name: spec.scientific_name,
          status: spec.status,
          typical_size_mm: spec.typical_size_mm,
          habitats: spec.habitats,
          notes: spec.notes
        }))
      };
    }

    // Cache the processed data
    dataCache[cacheKey] = analyticsData;
    cacheLastFetched[cacheKey] = now;
    
    console.log('scientific-data: cached analytics data for 1 hour:', {
      snailObservations: analyticsData.snailObservations.length,
      waterChemistry: analyticsData.waterChemistry.length,
      probeProfiles: analyticsData.probeProfiles.length, // Always 0 - not used
      snailSpecies: analyticsData.snailSpecies.length
    });
    
    return analyticsData;
    
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    throw new Error(`Failed to fetch analytics data: ${error.message}`);
  }
}

async function fetchCollectionFromFirebase(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const data = [];
  snapshot.forEach(doc => {
    data.push({ id: doc.id, ...doc.data() });
  });
  return data;
}

async function getCollectionData(collection) {
  // Check cache first (5-minute cache)
  const now = Date.now();
  const cacheKey = collection;
  
  if (dataCache[cacheKey] && cacheLastFetched[cacheKey] && 
      (now - cacheLastFetched[cacheKey]) < 300000) {
    console.log(`scientific-data: using cached data for ${collection}`);
    return dataCache[cacheKey];
  }

  // Cache miss or expired, read from Firebase
  console.log(`scientific-data: reading fresh data for ${collection} from Firebase`);
  
  try {
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(collection).get();
    const data = [];
    
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    
    // Cache the data
    dataCache[cacheKey] = data;
    cacheLastFetched[cacheKey] = now;
    
    console.log(`scientific-data: loaded ${data.length} records for ${collection}`);
    return data;
    
  } catch (error) {
    console.error(`Error reading ${collection} from Firebase:`, error);
    throw new Error(`Failed to read ${collection}: ${error.message}`);
  }
}
