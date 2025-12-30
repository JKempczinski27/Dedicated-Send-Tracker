# 🚂 Railway Deployment Guide
## NFL Brand Growth Tracker

This guide will walk you through deploying your Next.js application to Railway with persistent background jobs.

---

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **PostgreSQL Database**: Railway provides this for free

---

## 🚀 Quick Deploy Steps

### Step 1: Create New Project

1. Go to [railway.app](https://railway.app) and click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account and select your repository
4. Railway will automatically detect the Dockerfile

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a database and set `DATABASE_URL`

### Step 3: Configure Environment Variables

Click on your service → **"Variables"** tab → Add these variables:

#### Required Variables

```bash
# Database (automatically set by Railway when you add PostgreSQL)
DATABASE_URL=postgresql://...

# Node Environment
NODE_ENV=production

# Application URL (set this after deployment)
APP_URL=https://your-app.railway.app

# Port (Railway sets this automatically)
PORT=3000
```

#### Optional Variables (if using external APIs)

```bash
# NFL API Keys
NFL_CLIENT_KEY=your_nfl_client_key
NFL_CLIENT_SECRET=your_nfl_client_secret

# News API
NEWS_API_KEY=your_news_api_key

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key

# Email Service (if using SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
SUMMARY_EMAIL_FROM=noreply@yourdomain.com
SUMMARY_EMAIL_RECIPIENTS=admin@yourdomain.com,team@yourdomain.com

# Authentication
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
CRON_SECRET=your_cron_secret_key
```

#### Generate Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Deploy

1. Railway will automatically build and deploy your application
2. Monitor the build logs in the **"Deployments"** tab
3. Once deployed, you'll see a URL like `https://your-app.railway.app`

### Step 5: Configure Custom Domain (Optional)

1. Go to **"Settings"** → **"Domains"**
2. Click **"Generate Domain"** for a Railway subdomain
3. Or add your custom domain and configure DNS

---

## 🔧 Configuration Details

### Server Architecture

Your application now runs as a **persistent Node.js server** with:

- **Web Server**: Express + Next.js serving your dashboard
- **Background Jobs**: node-cron running scheduled tasks
- **Database**: PostgreSQL connection pool

### Scheduled Tasks

The following cron jobs run automatically:

| Task | Schedule | Description |
|------|----------|-------------|
| **Sentiment Update** | Every 10 minutes | Processes 15 players for sentiment analysis |
| **Executive Summary** | Monday 8:00 AM EST | Sends weekly email summary |

### File Structure

```
your-app/
├── server.js                    # Custom server with cron jobs
├── lib/
│   └── email-service.js        # Email service for summaries
├── pages/                      # Next.js pages (your dashboard)
├── Dockerfile                  # Production build configuration
├── package.json               # Updated with new scripts
└── RAILWAY_SETUP.md          # This file
```

---

## 📊 Monitoring & Health Checks

### Health Check Endpoint

Your app includes a health check at `/health`:

```bash
curl https://your-app.railway.app/health
```

Response:
```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "jobs": {
    "sentiment": {
      "running": false,
      "lastRun": "2024-01-15T10:20:00.000Z",
      "lastStatus": "success"
    },
    "email": {
      "running": false,
      "lastRun": "2024-01-15T08:00:00.000Z",
      "lastStatus": "success"
    }
  }
}
```

### Cron Status Endpoint

Check cron job status at `/api/cron-status`:

```bash
curl https://your-app.railway.app/api/cron-status
```

### Railway Logs

View real-time logs in Railway:
1. Click on your service
2. Go to **"Observability"** tab
3. See live logs from your application

---

## 🔄 Updating Your Application

### Option 1: Git Push (Recommended)

```bash
# Make your changes
git add .
git commit -m "Update application"
git push origin main

# Railway will automatically rebuild and redeploy
```

### Option 2: Manual Redeploy

1. Go to Railway dashboard
2. Click **"Deployments"**
3. Click **"Redeploy"** on the latest deployment

---

## 🐛 Troubleshooting

### Build Fails

**Issue**: Docker build fails during deployment

**Solutions**:
1. Check Railway logs for specific error
2. Ensure all dependencies are in `package.json`
3. Verify Dockerfile paths match your file structure

### Database Connection Errors

**Issue**: `Error: connection refused` or `ECONNREFUSED`

**Solutions**:
1. Verify PostgreSQL service is running in Railway
2. Check `DATABASE_URL` is set correctly
3. Ensure `ssl: { rejectUnauthorized: false }` is in database config

### Cron Jobs Not Running

**Issue**: Scheduled tasks aren't executing

**Solutions**:
1. Check `/health` endpoint to see job status
2. Review logs for cron execution messages
3. Verify `node-cron` schedule syntax
4. Ensure server is running (not just Next.js)

### Next.js Pages Not Loading

**Issue**: Dashboard shows 404 or doesn't load

**Solutions**:
1. Verify Next.js built successfully (check `.next` folder in logs)
2. Ensure `server.js` has `server.all('*', handle)` route
3. Check Railway deployment logs for build errors

### Environment Variables Not Working

**Issue**: API keys or configs not loading

**Solutions**:
1. Verify variables are set in Railway dashboard
2. Restart the service after adding new variables
3. Check for typos in variable names
4. Use `console.log(process.env.YOUR_VAR)` to debug

---

## 📧 Email Configuration (Optional)

If you want to send the weekly executive summary emails:

### Option 1: SendGrid

```bash
npm install @sendgrid/mail
```

Edit `lib/email-service.js`:
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: process.env.SUMMARY_EMAIL_RECIPIENTS.split(','),
  from: process.env.SUMMARY_EMAIL_FROM,
  subject: 'NFL Brand Growth Tracker - Weekly Summary',
  html: html
});
```

### Option 2: Nodemailer (SMTP)

```bash
npm install nodemailer
```

Edit `lib/email-service.js`:
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

await transporter.sendMail({
  from: process.env.SUMMARY_EMAIL_FROM,
  to: process.env.SUMMARY_EMAIL_RECIPIENTS,
  subject: 'NFL Brand Growth Tracker - Weekly Summary',
  html: html
});
```

---

## 💰 Cost Estimate

**Railway Pricing** (as of 2024):

- **Hobby Plan**: $5/month
  - Includes: 500 hours of usage, 100GB bandwidth
  - PostgreSQL database included
  - Perfect for personal projects

- **Pro Plan**: $20/month
  - Includes: Unlimited usage, 100GB bandwidth
  - Better for production apps

**Note**: Your app will use ~730 hours/month (always running), so Pro plan is recommended.

---

## 🎯 Next Steps

1. ✅ **Deploy to Railway** using this guide
2. ✅ **Test your dashboard** at the Railway URL
3. ✅ **Verify cron jobs** are running via `/health` endpoint
4. ✅ **Configure email service** (optional)
5. ✅ **Set up custom domain** (optional)
6. ✅ **Monitor logs** for the first few days

---

## 🔗 Useful Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Railway Docs**: https://docs.railway.app
- **Railway Status**: https://status.railway.app
- **Support**: https://help.railway.app

---

## 📞 Support

If you encounter issues:

1. Check Railway logs in the dashboard
2. Review this troubleshooting guide
3. Check Railway's documentation
4. Ask in Railway's Discord community

---

## 🎉 Migration Checklist

- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] PostgreSQL database added
- [ ] Environment variables configured
- [ ] Application deployed successfully
- [ ] Dashboard accessible via Railway URL
- [ ] Health check endpoint returning 200
- [ ] Cron jobs running (check logs)
- [ ] Database connection working
- [ ] Custom domain configured (optional)
- [ ] Email service configured (optional)
- [ ] Vercel deployment deleted/paused

---

**Congratulations!** 🎊 Your NFL Brand Growth Tracker is now running on Railway with persistent background jobs!
