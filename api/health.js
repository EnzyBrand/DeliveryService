/**
 * Health check endpoint for Vercel deployment
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Enzy Delivery Carrier Service',
    version: '1.0.0'
  });
}