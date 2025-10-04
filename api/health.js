// DISABLE HEALTH - Set to false to disable this endpoint
const HEALTH_ENABLED = false;

export default function handler(req, res) {
  // Early return if disabled
  if (!HEALTH_ENABLED) {
    return res.status(503).json({ error: 'Health service disabled' });
  }
  
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
}