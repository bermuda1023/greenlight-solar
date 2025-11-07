import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Find user by email in auth.users table
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error('Error fetching users:', userError);
      // Don't reveal if email exists for security
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const user = users.users.find(u => u.email === email.toLowerCase().trim());

    if (!user) {
      // Don't reveal if email doesn't exist for security
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours (temporarily extended for testing)

    // Store token in database
    const { error: insertError } = await supabase
      .from('admin_password_reset_tokens')
      .insert({
        user_id: user.id,
        token: token,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('Error creating reset token:', insertError);
      return res.status(500).json({ error: 'Failed to create reset token' });
    }

    // Send email with reset link
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/authentication/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background-color: #f9f9f9; }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your Greenlight Solar admin account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4CAF50;">${resetLink}</p>
            <div class="warning">
              <strong>Important:</strong>
              <ul>
                <li>This link will expire in 24 hours</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Do not share this link with anyone</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p><strong>Greenlight Solar</strong></p>
            <p>Email: billing@greenlightenergy.bm</p>
            <p>&copy; ${new Date().getFullYear()} Greenlight Solar. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Greenlight Solar - Account Security" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Greenlight Solar',
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    console.log(`Password reset email sent to: ${email}`);

    return res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Error in forgot-password:', error);
    return res.status(500).json({ error: 'An error occurred processing your request' });
  }
}
