const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookie = require('cookie');

// JWT secret - should be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Token expiration time (7 days)
const TOKEN_EXPIRES_IN = '7d';

/**
 * Generates a JWT token for a user
 */
function generateToken(username) {
  return jwt.sign(
    { username, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

/**
 * Verifies a JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Hashes a password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Compares a password with a hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Checks if credentials match environment variables
 */
async function verifyCredentials(username, password) {
  const envUsername = process.env.AUTH_USERNAME;
  const envPasswordHash = process.env.AUTH_PASSWORD_HASH;

  console.log('[AUTH DEBUG] Verifying credentials...');
  console.log('[AUTH DEBUG] Provided username:', username);
  console.log('[AUTH DEBUG] Expected username:', envUsername);
  console.log('[AUTH DEBUG] Password hash set:', !!envPasswordHash);
  console.log('[AUTH DEBUG] Password hash length:', envPasswordHash ? envPasswordHash.length : 0);

  if (!envUsername || !envPasswordHash) {
    throw new Error('Authentication not configured. Please set AUTH_USERNAME and AUTH_PASSWORD_HASH environment variables.');
  }

  if (username !== envUsername) {
    console.log('[AUTH DEBUG] Username mismatch!');
    return false;
  }

  const passwordMatch = await comparePassword(password, envPasswordHash);
  console.log('[AUTH DEBUG] Password match result:', passwordMatch);
  return passwordMatch;
}

/**
 * Extracts token from request cookies
 */
function getTokenFromRequest(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies.auth_token;
}

/**
 * Verifies authentication from request
 */
function verifyAuthFromRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

/**
 * Creates auth cookie string
 */
function createAuthCookie(token) {
  return cookie.serialize('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Creates logout cookie string (clears the auth cookie)
 */
function createLogoutCookie() {
  return cookie.serialize('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  verifyCredentials,
  getTokenFromRequest,
  verifyAuthFromRequest,
  createAuthCookie,
  createLogoutCookie,
};
