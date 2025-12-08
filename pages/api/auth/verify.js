const { verifyAuthFromRequest } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = verifyAuthFromRequest(req);

    if (!payload) {
      return res.status(401).json({
        authenticated: false,
        error: 'Not authenticated',
      });
    }

    return res.status(200).json({
      authenticated: true,
      username: payload.username,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({
      error: 'An error occurred during verification',
    });
  }
}
