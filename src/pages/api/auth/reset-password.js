import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('admin_password_reset_tokens')
      .select('*, user_id')
      .eq('token', token)
      .is('used_at', null) // Token hasn't been used
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Update user password using Supabase Admin API
    const { data: userData, error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('admin_password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (markUsedError) {
      console.error('Error marking token as used:', markUsedError);
    }

    // Invalidate all other reset tokens for this user
    const { error: invalidateError } = await supabase
      .from('admin_password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', tokenData.user_id)
      .is('used_at', null)
      .neq('token', token);

    if (invalidateError) {
      console.error('Error invalidating other tokens:', invalidateError);
    }

    // Send confirmation email
    try {
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
            .footer {
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
            }
            .info-box {
              background-color: #e3f2fd;
              border-left: 4px solid #2196F3;
              padding: 10px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Changed Successfully</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your password for your Greenlight Solar admin account has been successfully reset.</p>
              <div class="info-box">
                <strong>Security Information:</strong>
                <ul>
                  <li>Your password was changed on ${new Date().toLocaleString()}</li>
                  <li>If you did not make this change, please contact support immediately</li>
                  <li>All password reset tokens for your account have been invalidated</li>
                </ul>
              </div>
              <p>You can now sign in with your new password at:</p>
              <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/authentication/signin" style="color: #4CAF50;">${process.env.NEXT_PUBLIC_BASE_URL}/authentication/signin</a></p>
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
        to: userData.user.email,
        subject: 'Password Changed Successfully - Greenlight Solar',
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Password reset confirmation email sent to: ${userData.user.email}`);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Error in reset-password:', error);
    return res.status(500).json({ error: 'An error occurred resetting your password' });
  }
}
