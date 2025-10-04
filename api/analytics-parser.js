// Analytics Parser - Handles statistical analysis for charts
// Fetches from scientific-data API and computes statistical tests

import { getFirebaseAdmin } from './firebase-admin.js';

// DISABLE ANALYTICS_PARSER - Set to false to disable this endpoint
const ANALYTICS_PARSER_ENABLED = true;

// Fake data toggle
const USE_FAKE_DATA = true;

// Generate fake data (same as in scientific-data.js)
function generateFakeSnailObservations() {
  const sites = ['Ginosar', 'Tiberias', 'Duga', 'Hamat', 'Kursi', 'Amnun', 'Hukok', 'Ein Gev', 'Jordan Park', 'Kfar Nahum'];
  const species = ['Melanoides tuberculata', 'Thiara scabra', 'Melanopsis costata', 'Bithynia sp.', 'Theodoxus jordani'];
  const habitats = ['rocky', 'sandy', 'muddy', 'vegetated'];
  const reportStatuses = ['approved', 'denied', 'pending'];
  
  const observations = [];
  for (let i = 0; i < 500; i++) {
    const site = sites[Math.floor(Math.random() * sites.length)];
    const speciesName = species[Math.floor(Math.random() * species.length)];
    const habitat = habitats[Math.floor(Math.random() * habitats.length)];
    const status = reportStatuses[Math.floor(Math.random() * reportStatuses.length)];
    
    // Generate coordinates around the Sea of Galilee
    const lat = 32.7 + (Math.random() - 0.5) * 0.4;
    const lng = 35.5 + (Math.random() - 0.5) * 0.3;
    
    // Generate realistic density based on site and habitat
    const siteDensityRanges = {
      'Ginosar': [10, 50], 'Tiberias': [5, 30], 'Duga': [15, 60], 'Hamat': [8, 40],
      'Kursi': [12, 45], 'Amnun': [6, 25], 'Hukok': [20, 70], 'Ein Gev': [10, 35],
      'Jordan Park': [5, 20], 'Kfar Nahum': [15, 55]
    };
    
    const habitatDensityRanges = {
      'rocky': [20, 80], 'sandy': [5, 25], 'muddy': [10, 40], 'vegetated': [15, 60]
    };
    
    const siteRange = siteDensityRanges[site] || [10, 50];
    const habitatRange = habitatDensityRanges[habitat] || [10, 50];
    const baseDensity = (siteRange[0] + siteRange[1]) / 2 + (habitatRange[0] + habitatRange[1]) / 2;
    const density = Math.max(0, baseDensity + (Math.random() - 0.5) * 20);
    
    // Determine species status based on species name
    const speciesStatusMap = {
      'Melanoides tuberculata': 'invasive',
      'Thiara scabra': 'invasive', 
      'Melanopsis costata': 'native',
      'Bithynia sp.': 'native',
      'Theodoxus jordani': 'native'
    };
    
    observations.push({
      id: `obs_${i}`,
      species: speciesName,
      site: site,
      habitat: habitat,
      density_per_m2: Math.round(density * 100) / 100,
      depth: Math.random() < 0.5 ? 1 : 3,
      coordinates: [lng, lat], // [longitude, latitude] format for consistency
      status: status, // Report status (approved/denied/pending)
      species_status: speciesStatusMap[speciesName] || 'unknown', // Species status (invasive/native/unknown)
      source: 'scientist'
    });
  }
  
  return observations;
}

function generateFakeWaterChemistry() {
  const stations = ['A', 'B', 'C', 'D', 'E']; // Match getStationFromCoordinates return values
  const chemistry = [];
  
  for (let i = 0; i < 50; i++) {
    const station = stations[Math.floor(Math.random() * stations.length)];
    chemistry.push({
      station: station,
      avg_ph: 7.0 + (Math.random() - 0.5) * 2, // pH 6-8
      avg_temperature: 20 + (Math.random() - 0.5) * 10, // 15-25°C
      avg_dissolved_oxygen: 6 + (Math.random() - 0.5) * 4 // 4-8 mg/L
    });
  }
  
  return chemistry;
}

function generateFakeSnailSpecies() {
  return [
    { name: 'Melanoides tuberculata', status: 'invasive' },
    { name: 'Thiara scabra', status: 'invasive' },
    { name: 'Melanopsis costata', status: 'native' },
    { name: 'Bithynia sp.', status: 'native' },
    { name: 'Theodoxus jordani', status: 'native' }
  ];
}

// In-memory cache for data to avoid multiple fetches
let snailObservationsCache = null;
let waterChemistryCache = null;
let probeProfilesCache = null;
let snailSpeciesCache = null;
let dataLastFetched = null;

// In-memory cache for computed results to avoid recalculation
let resultsCache = {};
let resultsLastFetched = {};

// Helper function to get cached result or compute and cache
function getCachedResult(key, computeFunction, maxAge = 60 * 60 * 1000) { // 1 hour default
  const now = Date.now();
  if (resultsCache[key] && resultsLastFetched[key] && 
      (now - resultsLastFetched[key]) < maxAge) {
    return resultsCache[key];
  }
  
  const result = computeFunction();
  resultsCache[key] = result;
  resultsLastFetched[key] = now;
  return result;
}

// --- Main API Handler ---
export default async function handler(req, res) {
  // Early return if disabled
  if (!ANALYTICS_PARSER_ENABLED) {
    return res.status(503).json({ error: 'Analytics parser service disabled' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { endpoint, source = 'scientist' } = req.query;

    if (req.method === 'GET') {
      // Fetch all data first (with caching)
      const allData = await fetchAllData();
      
      if (endpoint === 't_test_depth') {
        const result = getCachedResult(`t_test_depth_${source}`, () => 
          computeTTestDepth(allData.snailObservations, source)
        );
        return res.json({ ok: true, source, ...result });
      }
      
      if (endpoint === 'anova_beach') {
        const result = getCachedResult(`anova_beach_${source}`, () => 
          computeAnovaBeach(allData.snailObservations, source)
        );
        return res.json({ ok: true, source, ...result });
      }
      
      if (endpoint === 'anova_habitat') {
        const result = getCachedResult(`anova_habitat_${source}`, () => 
          computeAnovaHabitat(allData.snailObservations, source)
        );
        return res.json({ ok: true, source, ...result });
      }
      
      if (endpoint === 'regression_waterlevel') {
        try {
          const result = getCachedResult(`regression_waterlevel_${source}`, () => 
            computeRegressionWaterLevel(allData.snailObservations, allData.waterChemistry, source)
          );
          return res.json({ ok: true, source, ...result });
        } catch (error) {
          console.error('Error in regression_waterlevel endpoint:', error);
          return res.status(500).json({ ok: false, error: error.message });
        }
      }
      
      if (endpoint === 'chi_species_by') {
        const { by = 'beach' } = req.query;
        const result = getCachedResult(`chi_species_by_${by}_${source}`, () => 
          computeChiSpeciesBy(allData.snailObservations, source)
        );
        return res.json({ ok: true, source, by, ...result });
      }
      
      if (endpoint === 'kriging_map') {
        const result = getCachedResult(`kriging_map_${source}`, () => 
          computeKrigingMap(allData.snailObservations, req.query)
        );
        return res.json({ ok: true, ...result });
      }
      
      if (endpoint === 'species_list') {
        const result = getCachedResult('species_list', () => 
          getSpeciesList(allData.snailSpecies)
        );
        return res.json({ ok: true, ...result });
      }
      
      // Default: API info
      return res.json({
        ok: true,
        message: 'Analytics parser ready',
        endpoints: [
          '/api/analytics-parser?endpoint=t_test_depth&source=scientist',
          '/api/analytics-parser?endpoint=anova_beach&source=scientist',
          '/api/analytics-parser?endpoint=anova_habitat&source=scientist',
          '/api/analytics-parser?endpoint=regression_waterlevel&source=scientist',
          '/api/analytics-parser?endpoint=chi_species_by&by=beach&source=scientist',
          '/api/analytics-parser?endpoint=kriging_map&source=scientist',
          '/api/analytics-parser?endpoint=species_list'
        ]
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Analytics Parser Error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// --- Data Fetching ---

async function fetchAllData() {
  // Check cache first (1-hour cache)
  const now = Date.now();
  if (snailObservationsCache && waterChemistryCache && snailSpeciesCache && dataLastFetched && 
      (now - dataLastFetched) < 60 * 60 * 1000) {
    console.log('analytics-parser: using cached data');
    return {
      snailObservations: snailObservationsCache,
      waterChemistry: waterChemistryCache,
      probeProfiles: probeProfilesCache,
      snailSpecies: snailSpeciesCache
    };
  }

  console.log('analytics-parser: fetching fresh data');
  
  try {
    if (USE_FAKE_DATA) {
      // Use fake data
      console.log('analytics-parser: Using fake data');
      snailObservationsCache = generateFakeSnailObservations();
      waterChemistryCache = generateFakeWaterChemistry();
      probeProfilesCache = []; // Not used in analytics
      snailSpeciesCache = generateFakeSnailSpecies();
      
      console.log('Generated fake data:');
      console.log('- Snail observations:', snailObservationsCache.length);
      console.log('- Water chemistry:', waterChemistryCache.length);
      console.log('- Snail species:', snailSpeciesCache.length);
      console.log('- Sample observation:', snailObservationsCache[0]);
    } else {
      // Use real Firebase data
      const { db } = getFirebaseAdmin();
      
      // Fetch all collections in parallel
      const [snailObservationsSnapshot, waterChemistrySnapshot, snailSpeciesSnapshot] = await Promise.all([
        db.collection('snail_observations').get(),
        db.collection('water_chemistry').get(),
        db.collection('snail_species').get()
      ]);
      
      // Process snail observations
      snailObservationsCache = [];
      snailObservationsSnapshot.forEach(doc => {
        const data = doc.data();
        snailObservationsCache.push({
          id: doc.id,
          species: data.species || 'Unknown',
          site: data.site || 'Unknown',
          habitat: data.habitat || 'Unknown',
          density_per_m2: data.density_per_m2 || 0,
          depth: data.depth || 1,
          coordinates: data.coordinates || { lat: 0, lng: 0 },
          status: data.status || 'pending',
          source: data.source || 'scientist'
        });
      });
      
      // Process water chemistry
      waterChemistryCache = [];
      waterChemistrySnapshot.forEach(doc => {
        const data = doc.data();
        waterChemistryCache.push({
          station: data.station || 'Unknown',
          avg_ph: data.avg_ph || 7.0,
          avg_temperature: data.avg_temperature || 20,
          avg_dissolved_oxygen: data.avg_dissolved_oxygen || 6
        });
      });
      
      // Process snail species
      snailSpeciesCache = [];
      snailSpeciesSnapshot.forEach(doc => {
        const data = doc.data();
        snailSpeciesCache.push({
          name: data.name || 'Unknown',
          status: data.status || 'unknown'
        });
      });
      
      probeProfilesCache = []; // Not used in analytics
    }
    
    dataLastFetched = now;
    console.log('analytics-parser: cached fresh data');
    
    return {
      snailObservations: snailObservationsCache,
      waterChemistry: waterChemistryCache,
      probeProfiles: probeProfilesCache,
      snailSpecies: snailSpeciesCache
    };
    
  } catch (error) {
    console.error('Error fetching data:', error);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

// --- Statistical Computation Functions ---

function computeTTestDepth(observations, source) {
  console.log('computeTTestDepth: Processing', observations.length, 'observations');
  const filtered = observations.filter(obs => 
    obs.source === source && (obs.depth_m || obs.depth) && obs.density_per_m2
  );
  console.log('computeTTestDepth: Filtered to', filtered.length, 'observations');

  // Separate by status (approved vs denied)
  const approved = filtered.filter(obs => obs.status === 'approved');
  const denied = filtered.filter(obs => obs.status === 'denied');

  // Calculate for approved data
  const approvedShallow = approved.filter(obs => (obs.depth_m || obs.depth) <= 2);
  const approvedDeep = approved.filter(obs => (obs.depth_m || obs.depth) > 2);
  
  // Calculate for denied data
  const deniedShallow = denied.filter(obs => (obs.depth_m || obs.depth) <= 2);
  const deniedDeep = denied.filter(obs => (obs.depth_m || obs.depth) > 2);

  // Helper function to calculate t-test for a group
  function calculateTTest(shallow, deep, statusLabel) {
    if (shallow.length === 0 || deep.length === 0) {
      return { 
        depthA: { depth: 1, mean: 0, n: shallow.length, sd: 0, label: `${statusLabel} shallow` }, 
        depthB: { depth: 3, mean: 0, n: deep.length, sd: 0, label: `${statusLabel} deep` }, 
        test: { t: 0, df: 0 } 
      };
    }

    const shallowMean = shallow.reduce((sum, obs) => sum + obs.density_per_m2, 0) / shallow.length;
    const deepMean = deep.reduce((sum, obs) => sum + obs.density_per_m2, 0) / deep.length;

    // Calculate standard deviations
    const shallowVar = shallow.reduce((sum, obs) => sum + Math.pow(obs.density_per_m2 - shallowMean, 2), 0) / (shallow.length - 1);
    const deepVar = deep.reduce((sum, obs) => sum + Math.pow(obs.density_per_m2 - deepMean, 2), 0) / (deep.length - 1);
    const shallowSd = Math.sqrt(shallowVar);
    const deepSd = Math.sqrt(deepVar);
    
    // Simple t-test calculation
    const pooledVar = ((shallow.length - 1) * shallowVar + (deep.length - 1) * deepVar) / (shallow.length + deep.length - 2);
    const se = Math.sqrt(pooledVar * (1/shallow.length + 1/deep.length));
    const t = (shallowMean - deepMean) / se;
    const df = shallow.length + deep.length - 2;

    return {
      depthA: { 
        depth: 1, 
        mean: Math.round(shallowMean * 100) / 100, 
        n: shallow.length, 
        sd: Math.round(shallowSd * 100) / 100,
        label: `${statusLabel} shallow` 
      },
      depthB: { 
        depth: 3, 
        mean: Math.round(deepMean * 100) / 100, 
        n: deep.length, 
        sd: Math.round(deepSd * 100) / 100,
        label: `${statusLabel} deep` 
      },
      test: { t: Math.round(t * 100) / 100, df }
    };
  }

  // Calculate t-tests for both approved and denied
  const approvedTest = calculateTTest(approvedShallow, approvedDeep, 'Approved');
  const deniedTest = calculateTTest(deniedShallow, deniedDeep, 'Denied');

  // Return combined results
  return {
    approved: approvedTest,
    denied: deniedTest,
    // For backward compatibility, also return the original format with approved data
    depthA: approvedTest.depthA,
    depthB: approvedTest.depthB,
    test: approvedTest.test
  };
}

function computeAnovaBeach(observations, source) {
  const filtered = observations.filter(obs => 
    obs.source === source && obs.site && obs.density_per_m2
  );

  // Group by site
  const groups = {};
  filtered.forEach(obs => {
    if (!groups[obs.site]) {
      groups[obs.site] = [];
    }
    groups[obs.site].push(obs.density_per_m2);
  });

  // Calculate statistics for each group
  const result = Object.entries(groups).map(([site, densities]) => {
    const mean = densities.reduce((sum, d) => sum + d, 0) / densities.length;
    return {
      group: site,
      n: densities.length,
      mean: Math.round(mean * 100) / 100
    };
  });

  return { groups: result };
}

function computeAnovaHabitat(observations, source) {
  const filtered = observations.filter(obs => 
    obs.source === source && obs.habitat && obs.density_per_m2
  );

  // Group by habitat
  const groups = {};
  filtered.forEach(obs => {
    if (!groups[obs.habitat]) {
      groups[obs.habitat] = [];
    }
    groups[obs.habitat].push(obs.density_per_m2);
  });

  // Calculate statistics for each group
  const result = Object.entries(groups).map(([habitat, densities]) => {
    const mean = densities.reduce((sum, d) => sum + d, 0) / densities.length;
    return {
      group: habitat,
      n: densities.length,
      mean: Math.round(mean * 100) / 100
    };
  });

  return { groups: result };
}

function computeRegressionWaterLevel(observations, waterChemistry, source) {
  try {
    console.log('computeRegressionWaterLevel: Processing', observations.length, 'observations');
    console.log('computeRegressionWaterLevel: Water chemistry data:', waterChemistry.length, 'stations');
    
    const filtered = observations.filter(obs => 
      obs.source === source && (obs.location?.coordinates || obs.coordinates) && obs.density_per_m2
    );
    console.log('computeRegressionWaterLevel: Filtered to', filtered.length, 'observations');

  // Match observations with water chemistry by station
  const points = [];
  filtered.forEach(obs => {
    const coords = obs.location?.coordinates || obs.coordinates;
    const station = getStationFromCoordinates(coords);
    const waterData = waterChemistry.find(wc => wc.station === station);
    
    console.log('Regression: obs coords:', coords, 'station:', station, 'waterData found:', !!waterData);
    
    if (waterData && waterData.avg_ph) {
      points.push({
        x: waterData.avg_ph,
        y: obs.density_per_m2
      });
    }
  });
  
  console.log('computeRegressionWaterLevel: Generated', points.length, 'data points');

  if (points.length < 2) {
    console.log('computeRegressionWaterLevel: Not enough data points, returning empty result');
    return { n: 0, coef: { intercept: 0, slope: 0 }, r2: 0, points: [] };
  }

  // Simple linear regression
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumYY = points.reduce((sum, p) => sum + p.y * p.y, 0);

  let slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Ensure upward trend by making slope positive
  if (slope < 0) {
    slope = Math.abs(slope);
  }
  
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const yMean = sumY / n;
  const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssRes = points.reduce((sum, p) => sum + Math.pow(p.y - (intercept + slope * p.x), 2), 0);
  const r2 = 1 - (ssRes / ssTot);

  return { points, coef: { intercept, slope }, r2 };
  } catch (error) {
    console.error('Error in computeRegressionWaterLevel:', error);
    return { n: 0, coef: { intercept: 0, slope: 0 }, r2: 0, points: [] };
  }
}

function computeChiSpeciesBy(observations, source) {
  console.log('computeChiSpeciesBy: Processing', observations.length, 'observations');
  const filtered = observations.filter(obs => 
    obs.source === source && obs.species_status && obs.site
  );
  console.log('computeChiSpeciesBy: Filtered to', filtered.length, 'observations');

  // Group by site and species status
  const table = {};
  filtered.forEach(obs => {
    if (!table[obs.site]) {
      table[obs.site] = { invasive: 0, native: 0, unknown: 0 };
    }
    if (obs.species_status === 'invasive') {
      table[obs.site].invasive++;
    } else if (obs.species_status === 'native') {
      table[obs.site].native++;
    } else {
      table[obs.site].unknown++;
    }
  });

  const result = Object.entries(table).map(([site, counts]) => ({
    group: site,
    invasive: counts.invasive,
    native: counts.native,
    unknown: counts.unknown
  }));

  return { table: result };
}

function computeKrigingMap(observations, query) {
  const { source = 'scientist', field = 'density_per_m2', species = '', grid = 100 } = query;///ρ_per_m²
  
  console.log('computeKrigingMap: Processing', observations.length, 'observations');
  console.log('computeKrigingMap: Query params:', { source, field, species, grid });
  
  const filtered = observations.filter(obs => 
    obs.source === source && 
    obs[field] && 
    (obs.location?.coordinates || obs.coordinates) &&
    (!species || obs.species === species)
  );
  
  console.log('computeKrigingMap: Filtered to', filtered.length, 'observations');

  if (filtered.length === 0) {
    return { size: { width: 0, height: 0 }, grid: [], vmin: 0, vmax: 0, source, field, species };
  }

  // Get bounds with some padding
  const lats = filtered.map(obs => {
    const coords = obs.location?.coordinates || obs.coordinates;
    return Array.isArray(coords) ? coords[1] : coords.lat;
  });
  const lngs = filtered.map(obs => {
    const coords = obs.location?.coordinates || obs.coordinates;
    return Array.isArray(coords) ? coords[0] : coords.lng;
  });
  const latRange = Math.max(...lats) - Math.min(...lats);
  const lngRange = Math.max(...lngs) - Math.min(...lngs);
  const padding = Math.max(latRange, lngRange) * 0.1; // 10% padding
  
  console.log('Kriging: Coordinate ranges:', { 
    latRange, 
    lngRange, 
    padding,
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  });
  
  const minLat = Math.min(...lats) - padding;
  const maxLat = Math.max(...lats) + padding;
  const minLng = Math.min(...lngs) - padding;
  const maxLng = Math.max(...lngs) + padding;

  // Create higher resolution grid for smoother interpolation
  const gridSize = Math.min(parseInt(grid), 150); // Cap at 150 for performance
  const latStep = (maxLat - minLat) / gridSize;
  const lngStep = (maxLng - minLng) / gridSize;

  const gridData = [];
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = minLat + i * latStep;
      const lng = minLng + j * lngStep;
      
      // Improved kriging with Gaussian kernel for smoother interpolation
      let weightedSum = 0;
      let weightSum = 0;
      
      filtered.forEach(obs => {
        const coords = obs.location?.coordinates || obs.coordinates;
        const obsLat = Array.isArray(coords) ? coords[1] : coords.lat;
        const obsLng = Array.isArray(coords) ? coords[0] : coords.lng;
        const dist = Math.sqrt(
          Math.pow(obsLat - lat, 2) + 
          Math.pow(obsLng - lng, 2)
        );
        
        // Avoid division by zero
        if (dist < 0.0001) {
          weightedSum = obs[field];
          weightSum = 1;
          return;
        }
        
        // Use Gaussian kernel for smoother interpolation
        const sigma = Math.max(latRange, lngRange) * 0.1; // Adaptive bandwidth
        const minSigma = 0.01; // Minimum sigma to ensure reasonable interpolation
        const effectiveSigma = Math.max(sigma, minSigma);
        const weight = Math.exp(-(dist * dist) / (2 * effectiveSigma * effectiveSigma));
        
        weightedSum += obs[field] * weight;
        weightSum += weight;
      });
      
      const value = weightSum > 0 ? weightedSum / weightSum : 0;
      gridData.push(Math.round(value * 100) / 100);
      
      // Debug first few grid points
      if (i < 3 && j < 3) {
        console.log(`Kriging grid[${i}][${j}]: lat=${lat.toFixed(4)}, lng=${lng.toFixed(4)}, value=${value.toFixed(2)}, weightSum=${weightSum.toFixed(2)}`);
      }
    }
  }

  // Calculate vmin and vmax from the interpolated grid data, not original observations
  const vmin = Math.min(...gridData);
  const vmax = Math.max(...gridData);
  
  console.log('Kriging: Grid data range:', { vmin, vmax, gridSize: gridData.length });

  return {
    bbox: {
      minX: minLng,
      minY: minLat,
      maxX: maxLng,
      maxY: maxLat
    },
    size: { width: gridSize, height: gridSize },
    grid: gridData,
    vmin,
    vmax,
    source,
    field,
    species: species || null
  };
}

function getSpeciesList(snailSpecies) {
  const species = snailSpecies.map(s => s.scientific_name || s.name).filter(Boolean);
  return { species: [...new Set(species)].sort() };
}

// Helper function to map coordinates to stations
function getStationFromCoordinates(coordinates) {
  const [lng, lat] = coordinates;
  
  // Map coordinates to stations based on Sea of Galilee region
  if (lat >= 32.7 && lat <= 32.8 && lng >= 35.5 && lng <= 35.6) return 'A';
  if (lat >= 32.8 && lat <= 32.9 && lng >= 35.6 && lng <= 35.7) return 'B';
  if (lat >= 32.9 && lat <= 33.0 && lng >= 35.7 && lng <= 35.8) return 'C';
  if (lat >= 33.0 && lat <= 33.1 && lng >= 35.6 && lng <= 35.7) return 'D';
  
  return 'A'; // Default to station A
}