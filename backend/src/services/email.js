const { google } = require('googleapis');

// Create Gmail API client with OAuth
function createGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Create email in base64 format for Gmail API (without attachments)
function createEmail(to, subject, htmlContent, textContent) {
  const fromEmail = process.env.EMAIL_FROM || 'promptstackhello@gmail.com';

  const messageParts = [
    `From: PromptStack <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="boundary"',
    '',
    '--boundary',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    textContent,
    '',
    '--boundary',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlContent,
    '',
    '--boundary--'
  ];

  const message = messageParts.join('\r\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Create email with attachments in base64 format for Gmail API
function createEmailWithAttachments(to, subject, htmlContent, textContent, attachments = []) {
  const fromEmail = process.env.EMAIL_FROM || 'promptstackhello@gmail.com';
  const mainBoundary = 'main_boundary_' + Date.now();
  const altBoundary = 'alt_boundary_' + Date.now();

  let messageParts = [
    `From: PromptStack <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mainBoundary}"`,
    '',
    `--${mainBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    textContent || '',
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlContent,
    '',
    `--${altBoundary}--`,
  ];

  // Add attachments
  for (const attachment of attachments) {
    const base64Content = attachment.content.toString('base64');
    messageParts.push(
      '',
      `--${mainBoundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      base64Content
    );
  }

  messageParts.push('', `--${mainBoundary}--`);

  const message = messageParts.join('\r\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Send email using Gmail API
async function sendEmail(to, subject, htmlContent, textContent) {
  try {
    const gmail = createGmailClient();
    const encodedMessage = createEmail(to, subject, htmlContent, textContent);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Gmail API send error:', error);
    return { success: false, error: error.message };
  }
}

// Send email with attachments using Gmail API
async function sendEmailWithAttachments(to, subject, htmlContent, textContent, attachments) {
  try {
    const gmail = createGmailClient();
    const encodedMessage = createEmailWithAttachments(to, subject, htmlContent, textContent, attachments);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Gmail API send error with attachments:', error);
    return { success: false, error: error.message };
  }
}

// Send verification email
async function sendVerificationEmail(email, name, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verificationUrl = `${frontendUrl}/verify?token=${token}`;
  
  const subject = 'Verify your PromptStack account';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin-bottom: 10px;">PromptStack</h1>
          <p style="color: #666; font-size: 14px;">Built by Kiwis, for Kiwis</p>
        </div>
        
        <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #2d3748;">Kia ora${name ? ` ${name}` : ''}!</h2>
          <p>Welcome to PromptStack. Please verify your email address to get started with your premium AI prompt library.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">Verify Email Address</a>
          </div>
          
          <p style="font-size: 14px; color: #666;">This link will expire in 24 hours.</p>
          
          <p style="font-size: 14px; color: #666;">If you did not create an account, please ignore this email.</p>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px;">
          <p>If the button does not work, copy and paste this link:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>PromptStack</p>
          <p>Auckland, New Zealand</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Kia ora${name ? ` ${name}` : ''}!

Welcome to PromptStack. Please verify your email address to get started with your premium AI prompt library.

Click or copy this link to verify: ${verificationUrl}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

PromptStack - Built by Kiwis, for Kiwis
  `;

  return sendEmail(email, subject, htmlContent, textContent);
}

// Send welcome email after verification
async function sendWelcomeEmail(email, name) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const subject = 'Welcome to PromptStack!';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d;">PromptStack</h1>
        </div>
        
        <div style="background: #f7fafc; border-radius: 8px; padding: 30px;">
          <h2 style="margin-top: 0; color: #2d3748;">Sweet as, ${name || 'mate'}!</h2>
          <p>Your email has been verified and your account is ready to go.</p>
          
          <h3 style="color: #2d3748;">Get started:</h3>
          <ul>
            <li>Browse our curated AI prompt library</li>
            <li>Save your favourite prompts</li>
            <li>Create your own custom prompts</li>
            <li>Upgrade to unlock premium content</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/dashboard" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">Go to Dashboard</a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>PromptStack - Built by Kiwis, for Kiwis</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Sweet as, ${name || 'mate'}!

Your email has been verified and your account is ready to go.

Get started:
- Browse our curated AI prompt library
- Save your favourite prompts
- Create your own custom prompts
- Upgrade to unlock premium content

Go to Dashboard: ${frontendUrl}/dashboard

PromptStack - Built by Kiwis, for Kiwis
  `;

  return sendEmail(email, subject, htmlContent, textContent);
}

module.exports = {
  sendEmail,
  sendEmailWithAttachments,
  sendVerificationEmail,
  sendWelcomeEmail
};
