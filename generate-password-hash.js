#!/usr/bin/env node
/**
 * Generate a password hash for authentication
 * Usage: node generate-password-hash.js <password>
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Error: Password is required');
  console.log('\nUsage: node generate-password-hash.js <password>');
  console.log('Example: node generate-password-hash.js MySecurePassword123');
  process.exit(1);
}

if (password.length < 8) {
  console.warn('Warning: Password is less than 8 characters. Consider using a longer password.');
}

console.log('\nGenerating password hash...\n');

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }

  console.log('Password hash generated successfully!');
  console.log('\nAdd these environment variables to your Vercel project:\n');
  console.log('AUTH_USERNAME=your_username');
  console.log(`AUTH_PASSWORD_HASH=${hash}`);
  console.log('\nYou can also add these to your .env file for local development.');
  console.log('\nIMPORTANT: Keep the hash secret and never commit it to version control!');
});
