const { verifyCredentials, generateToken, createAuthCookie } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Verify credentials
    const isValid = await verifyCredentials(username, password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = generateToken(username);

    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', createAuthCookie(token));

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      username,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred during login',
    });
  }
}
