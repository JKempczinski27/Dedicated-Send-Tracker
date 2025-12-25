# Weekly Executive Summary Email

This feature automatically sends a professional executive summary email every Monday morning at 8:00 AM EST, providing high-level insights about your tracked NFL players.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [Configuration](#configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

---

## 🎯 Overview

The Weekly Executive Summary Email provides:

- **Crisis Alerts**: Players with negative sentiment and high news volume
- **Injury Report**: All players currently on injury reports
- **Top Sentiment Movers**: Biggest positive and negative sentiment changes
- **Key Metrics**: Total players tracked, news articles analyzed, average sentiment

The email is professionally formatted with your existing navy/red color scheme and optimized for mobile and desktop viewing.

---

## ✨ Features

### 1. **Crisis Alerts**
Automatically detects players in potential crisis situations:
- Negative sentiment score (< -0.3)
- High news volume (> 5 articles)
- Severity scoring (0-100)
- Includes injury status if applicable

### 2. **Injury Report**
Lists all players with active injuries:
- Injury status (Out, Doubtful, Questionable, Probable)
- Specific injury details
- Practice participation status
- Sorted by severity

### 3. **Top Sentiment Movers**
Highlights players with extreme sentiment changes:
- Top 3 most positive movers
- Top 3 most negative movers
- Article count and sentiment scores
- Visual indicators (📈/📉)

### 4. **Executive Summary Stats**
Overview metrics:
- Total players tracked
- Total news articles analyzed
- Average sentiment across all players

---

## 🚀 Setup Instructions

### Step 1: Get a Resend API Key

1. Go to [resend.com](https://resend.com) and sign up for a free account
2. Navigate to **API Keys** in the dashboard
3. Create a new API key
4. Copy the API key (starts with `re_`)

### Step 2: Verify Your Domain (or use Resend's test domain)

**Option A: Use Resend's Test Domain (for testing)**
- No setup required
- Can only send to your verified email address
- Good for testing before production

**Option B: Verify Your Custom Domain (for production)**
1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `yourdomain.com`)
3. Add the required DNS records (SPF, DKIM, DMARC)
4. Wait for verification (usually 5-10 minutes)

### Step 3: Configure Environment Variables

Add the following to your `.env.local` file (and Vercel environment variables):

```bash
# Email Configuration
RESEND_API_KEY=re_your_actual_resend_api_key_here
EMAIL_FROM=noreply@yourdomain.com
EMAIL_TO=your-email@example.com

# Cron Job Security
CRON_SECRET=your-random-secret-string-here
```

**Important Notes:**
- `EMAIL_FROM` must be from a verified domain in Resend
  - For testing: use `onboarding@resend.dev` (Resend's test domain)
  - For production: use your verified domain (e.g., `noreply@yourdomain.com`)
- `EMAIL_TO` is where the weekly summary will be sent
- `CRON_SECRET` should be a strong random string (use a password generator)

### Step 4: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `EMAIL_TO`
   - `CRON_SECRET`
4. Make sure to add them for **Production**, **Preview**, and **Development** environments

### Step 5: Deploy to Vercel

The cron job is configured in `vercel.json` and will automatically activate on deployment:

```bash
git add .
git commit -m "Add weekly email summary feature"
git push
```

After deployment, Vercel will automatically schedule the cron job.

---

## ⚙️ Configuration

### Cron Schedule

The cron job runs every Monday at 8:00 AM EST:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-summary",
      "schedule": "0 13 * * 1"
    }
  ]
}
```

**Schedule Breakdown:**
- `0` - Minute (0)
- `13` - Hour (13:00 UTC = 8:00 AM EST)
- `*` - Any day of month
- `*` - Any month
- `1` - Monday (0=Sunday, 1=Monday, etc.)

### Customizing the Schedule

To change when emails are sent, modify the `schedule` in `vercel.json`:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7) (0=Sunday, 7=Sunday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Examples:**
- Every Monday at 9:00 AM EST: `"0 14 * * 1"`
- Every day at 8:00 AM EST: `"0 13 * * *"`
- Every Friday at 5:00 PM EST: `"0 22 * * 5"`

**Important:** Vercel cron jobs run in UTC time zone. EST is UTC-5 (or UTC-4 during daylight saving).

### Customizing Alert Thresholds

Edit `lib/summaryGenerator.js` to adjust crisis detection:

```javascript
// Current thresholds
const hasNegativeSentiment = analysis?.avgSentiment < -0.3;
const hasHighVolume = (analysis?.totalArticles || 0) > 5;

// Example: More sensitive
const hasNegativeSentiment = analysis?.avgSentiment < -0.2;
const hasHighVolume = (analysis?.totalArticles || 0) > 3;

// Example: Less sensitive
const hasNegativeSentiment = analysis?.avgSentiment < -0.5;
const hasHighVolume = (analysis?.totalArticles || 0) > 10;
```

---

## 🧪 Testing

### Test 1: Simple Email Test

Send a basic test email to verify your Resend configuration:

```bash
curl -X POST https://your-app.vercel.app/api/cron/test-email \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-cron-secret" \
  -d '{"type": "simple"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "type": "simple"
}
```

### Test 2: Full Weekly Summary Test

Send a complete weekly summary using your current player data:

```bash
curl -X POST https://your-app.vercel.app/api/cron/test-email \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-cron-secret" \
  -d '{"type": "summary"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Weekly summary test email sent successfully",
  "type": "summary",
  "playerCount": 5,
  "emailSent": true
}
```

### Test 3: Trigger Weekly Summary Manually

Manually trigger the actual cron job endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/cron/weekly-summary \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-cron-secret"
```

### Local Testing

To test locally during development:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Use the test endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/cron/test-email \
     -H "Content-Type: application/json" \
     -H "x-cron-secret: your-cron-secret" \
     -d '{"type": "simple"}'
   ```

---

## 🔧 Troubleshooting

### Issue: Email not sending

**Check:**
1. Verify `RESEND_API_KEY` is correct in Vercel environment variables
2. Confirm `EMAIL_FROM` is from a verified domain in Resend
3. Check Vercel function logs for errors:
   ```bash
   vercel logs your-deployment-url
   ```
4. Test with the simple email test first

**Common Errors:**
- `"Invalid API key"` - Check your Resend API key
- `"Domain not verified"` - Use `onboarding@resend.dev` for testing or verify your domain
- `"Unauthorized"` - Check `CRON_SECRET` matches in both request and environment

### Issue: Cron job not running

**Check:**
1. Verify `vercel.json` is properly formatted
2. Check Vercel dashboard → **Settings** → **Cron Jobs**
3. Confirm you're on a Vercel plan that supports cron jobs (Pro plan or higher)
4. Check cron job logs in Vercel dashboard

**Note:** Vercel cron jobs require a Pro plan or higher. Hobby plans do not support cron jobs.

### Issue: Missing player data in summary

**Check:**
1. Ensure players have been tracked recently (run update-all)
2. Verify `cached_data` is populated in the database
3. Check that NEWS_API_KEY is configured for sentiment analysis

**Run an update before testing:**
```bash
curl -X POST https://your-app.vercel.app/api/update-all
```

### Issue: Email formatting looks broken

**Check:**
1. Test in multiple email clients (Gmail, Outlook, Apple Mail)
2. Verify HTML is valid (missing closing tags, etc.)
3. Some email clients have limited CSS support - the template uses inline styles for compatibility

### View Logs

**Vercel Production Logs:**
```bash
vercel logs --follow
```

**Check specific function:**
```bash
vercel logs /api/cron/weekly-summary
```

---

## 🏗️ Architecture

### File Structure

```
├── lib/
│   ├── emailService.js          # Resend email integration
│   └── summaryGenerator.js      # HTML generation & data analysis
├── pages/
│   └── api/
│       └── cron/
│           ├── weekly-summary.js  # Scheduled cron job endpoint
│           └── test-email.js      # Testing endpoint
├── vercel.json                    # Cron job configuration
└── .env.example                   # Environment variable template
```

### Data Flow

1. **Cron Trigger** (Monday 8:00 AM EST)
   - Vercel triggers `/api/cron/weekly-summary`
   - Security check validates `CRON_SECRET`

2. **Data Collection**
   - `PostgresWatchlistManager` fetches all players
   - Reads `cached_data` with injury, news, and sentiment info

3. **Analysis**
   - `SummaryGenerator` analyzes player data
   - Identifies crisis alerts, injuries, and sentiment movers
   - Calculates summary statistics

4. **Email Generation**
   - `SummaryGenerator` creates HTML email
   - Applies navy/red color scheme
   - Formats data into executive summary sections

5. **Email Delivery**
   - `EmailService` sends via Resend API
   - Logs success/failure
   - Returns result to cron job

### Security

- **CRON_SECRET**: Prevents unauthorized triggering of cron jobs
- **Header Validation**: Checks `x-cron-secret` or `authorization` header
- **Environment Variables**: Sensitive data stored securely in Vercel
- **API Key Protection**: Resend API key never exposed to client

### Performance

- **Timeout**: 60 seconds (configured in `export const config`)
- **Optimized Queries**: Single database query fetches all players
- **Efficient Rendering**: HTML template generated server-side
- **Error Handling**: Continues even if individual players fail

---

## 📊 Email Template Sections

### 1. Header
- Gradient navy background
- App name and date
- Professional branding

### 2. Overview Metrics
- Total players tracked
- Total news articles
- Average sentiment score
- Visual cards with color-coded values

### 3. Crisis Alerts
- Red alert boxes for high-priority issues
- Severity scores (0-100)
- Sentiment + volume indicators
- Injury status if applicable
- Green success message if no crises

### 4. Injury Report
- Color-coded by severity (red = Out, yellow = Questionable)
- Injury details and practice status
- Sorted by severity (most severe first)
- Green success message if no injuries

### 5. Top Sentiment Movers
- Positive movers (green boxes, 📈)
- Negative movers (red boxes, 📉)
- Sentiment scores and article counts
- Top 3 in each category

### 6. Footer
- Generation timestamp
- Branding
- EST timezone indicator

---

## 🎨 Customization

### Changing Colors

Edit `lib/summaryGenerator.js`:

```javascript
this.brandColors = {
  navy: '#0a2463',        // Your primary navy
  red: '#dc2626',         // Your accent red
  lightGray: '#f5f7fa',   // Background
  // ... add more colors
};
```

### Changing Email Subject

Edit `lib/emailService.js`:

```javascript
async sendWeeklySummary(htmlContent) {
  const subject = `📊 NFL Brand Growth Tracker - Weekly Executive Summary (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
  // Customize subject line here
  return this.sendEmail(subject, htmlContent);
}
```

### Adding More Sections

Edit `lib/summaryGenerator.js` and add new methods:

```javascript
generateCustomSection(players) {
  // Your analysis logic
  return `<div>...</div>`;
}

// Then add to main template:
generateWeeklySummaryHTML(players) {
  return `
    ...
    ${this.generateCrisisAlertsSection(crisisAlerts)}
    ${this.generateCustomSection(players)}  // Add here
    ${this.generateInjuriesSection(injuries)}
    ...
  `;
}
```

---

## 🔐 Security Best Practices

1. **Use Strong CRON_SECRET**
   - Generate with: `openssl rand -base64 32`
   - Never commit to git
   - Rotate periodically

2. **Verify Sender Domain**
   - Add SPF, DKIM, DMARC records
   - Prevents email spoofing
   - Improves deliverability

3. **Limit Email Recipients**
   - Only send to authorized addresses
   - Consider adding recipient allowlist

4. **Monitor Usage**
   - Check Resend dashboard for send volume
   - Set up alerts for failures
   - Review logs regularly

---

## 📈 Next Steps

### Potential Enhancements

1. **Multiple Recipients**
   - Add support for CC/BCC
   - Different summaries for different stakeholders

2. **Email Preferences**
   - Allow users to configure frequency
   - Choose which sections to include
   - Set custom thresholds

3. **Slack/Teams Integration**
   - Send summaries to team channels
   - Interactive message components

4. **PDF Attachments**
   - Generate PDF version of summary
   - Include charts and graphs

5. **Daily Digests**
   - Add daily brief for critical updates
   - Breaking news alerts

6. **Analytics Dashboard**
   - Track email open/click rates
   - Monitor engagement over time

---

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RESEND_API_KEY` | ✅ Yes | Resend API key for sending emails | `re_abc123...` |
| `EMAIL_FROM` | ✅ Yes | Sender email (must be verified domain) | `noreply@yourdomain.com` |
| `EMAIL_TO` | ✅ Yes | Recipient email for weekly summary | `john@example.com` |
| `CRON_SECRET` | ✅ Yes | Secret for authenticating cron requests | `super-secret-string` |

---

## 🆘 Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review Vercel function logs
3. Test with simple email first
4. Verify all environment variables are set correctly
5. Check Resend dashboard for delivery status

---

## 📜 License

This feature is part of the NFL Brand Growth Tracker project.
