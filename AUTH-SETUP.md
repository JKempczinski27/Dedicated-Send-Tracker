# Authentication Setup Guide

Your NFL Injury Tracker now includes username/password authentication to protect your dashboard from unauthorized access.

## Quick Setup

### 1. Generate Password Hash

First, generate a secure password hash for your login credentials:

```bash
node generate-password-hash.js YourSecurePassword123
```

This will output something like:
```
AUTH_USERNAME=your_username
AUTH_PASSWORD_HASH=$2a$10$abcd1234efgh5678ijkl...
```

### 2. Set Environment Variables

#### For Vercel (Production)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=<paste the hash from step 1>
JWT_SECRET=<generate a random 32+ character string>
```

**Important:** Use a strong, random string for `JWT_SECRET` in production!

#### For Local Development

Create a `.env` file in your project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Then edit `.env` and add your credentials:

```
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=<paste the hash from step 1>
JWT_SECRET=my-local-development-secret-key
```

### 3. Redeploy (if on Vercel)

After adding the environment variables, redeploy your application:
- Vercel will automatically redeploy when you push to your connected branch
- Or manually trigger a redeploy from the Vercel dashboard

### 4. Login

Visit your dashboard URL (e.g., `https://your-app.vercel.app`) and you'll be redirected to the login page.

Enter your username and password to access the dashboard.

## Security Features

✅ **Password Hashing** - Passwords are hashed with bcrypt (10 rounds)
✅ **JWT Tokens** - Secure session management with HTTP-only cookies
✅ **Protected API Routes** - All watchlist operations require authentication
✅ **7-Day Sessions** - Stay logged in for 7 days (configurable)
✅ **Secure Cookies** - HTTPS-only cookies in production

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_USERNAME` | **Yes** | Your login username |
| `AUTH_PASSWORD_HASH` | **Yes** | Bcrypt hash of your password |
| `JWT_SECRET` | No | Secret key for JWT tokens (uses default if not set) |

## Changing Your Password

1. Generate a new password hash:
   ```bash
   node generate-password-hash.js NewPassword456
   ```

2. Update `AUTH_PASSWORD_HASH` in your environment variables:
   - **Vercel**: Update in Settings → Environment Variables → Redeploy
   - **Local**: Update in `.env` file → Restart server

## Troubleshooting

### "Authentication not configured" error

Make sure both `AUTH_USERNAME` and `AUTH_PASSWORD_HASH` are set in your environment variables.

### Can't login / "Invalid username or password"

1. Double-check your username matches `AUTH_USERNAME`
2. Regenerate your password hash to make sure it's correct:
   ```bash
   node generate-password-hash.js YourPassword
   ```
3. Make sure you copied the **entire** hash (it's very long!)

### Getting redirected to login repeatedly

1. Check that `JWT_SECRET` is set consistently
2. Make sure cookies are enabled in your browser
3. Check browser console for errors

### Session expires too quickly

By default, sessions last 7 days. To change this, edit `lib/auth.js:8`:
```javascript
const TOKEN_EXPIRES_IN = '30d'; // Change to 30 days
```

## Advanced Configuration

### Multiple Users (Future Enhancement)

Currently, the system supports a single username/password. To add multiple users:

1. Create a `users` table in PostgreSQL
2. Store username/hash pairs in the database
3. Modify `lib/auth.js` to check against the database

### Custom Session Duration

Edit `lib/auth.js` to change session length:
```javascript
const TOKEN_EXPIRES_IN = '30d'; // 30 days
const TOKEN_EXPIRES_IN = '12h'; // 12 hours
const TOKEN_EXPIRES_IN = '1h';  // 1 hour
```

### Disable Authentication (Not Recommended)

If you want to disable authentication (e.g., for internal network use):

1. Remove authentication checks from API routes
2. Remove authentication check from `pages/index.js`
3. Delete or rename `pages/login.js`

**Warning:** Only disable authentication if your dashboard is behind a firewall or VPN!

## Security Best Practices

1. ✅ Use a strong password (12+ characters, mixed case, numbers, symbols)
2. ✅ Use a random JWT_SECRET (32+ characters)
3. ✅ Never commit `.env` file to version control
4. ✅ Change default passwords immediately
5. ✅ Enable HTTPS for production (Vercel does this automatically)
6. ✅ Regularly update your password
7. ✅ Don't share your password hash publicly

## Need Help?

- Check the [main README](README.md) for general setup
- Review [DEPLOY.md](DEPLOY.md) for deployment instructions
- Check [POSTGRES-SETUP.md](POSTGRES-SETUP.md) for database setup
