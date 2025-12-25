// Email Service using Resend
// Handles sending HTML emails for weekly summaries and alerts

const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.resend = null;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@yourdomain.com';
    this.toEmail = process.env.EMAIL_TO;

    // Initialize Resend if API key is available
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  /**
   * Send an HTML email
   * @param {string} subject - Email subject line
   * @param {string} htmlContent - HTML content of the email
   * @param {string} toEmail - Optional override for recipient email
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail(subject, htmlContent, toEmail = null) {
    try {
      // Validate configuration
      if (!this.resend) {
        throw new Error('Resend API key not configured. Set RESEND_API_KEY in .env');
      }

      const recipient = toEmail || this.toEmail;
      if (!recipient) {
        throw new Error('No recipient email configured. Set EMAIL_TO in .env');
      }

      console.log(`📧 Sending email to: ${recipient}`);
      console.log(`📋 Subject: ${subject}`);

      // Send email via Resend
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipient,
        subject: subject,
        html: htmlContent,
      });

      console.log('✅ Email sent successfully:', result);
      return {
        success: true,
        data: result,
      };

    } catch (error) {
      console.error('❌ Email send failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send the weekly executive summary email
   * @param {string} htmlContent - Generated HTML summary
   * @returns {Promise<Object>} - Send result
   */
  async sendWeeklySummary(htmlContent) {
    const subject = `📊 NFL Brand Growth Tracker - Weekly Executive Summary (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    return this.sendEmail(subject, htmlContent);
  }

  /**
   * Send a test email to verify configuration
   * @returns {Promise<Object>} - Send result
   */
  async sendTestEmail() {
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f7fa;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 40px;">
              <h1 style="color: #0a2463; margin: 0 0 20px 0; font-size: 24px;">🎉 Email Service Test</h1>
              <p style="color: #333; margin: 0 0 16px 0; line-height: 1.6;">
                Your NFL Brand Growth Tracker email service is configured correctly!
              </p>
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail('🧪 NFL Brand Growth Tracker - Test Email', testHtml);
  }
}

module.exports = EmailService;
