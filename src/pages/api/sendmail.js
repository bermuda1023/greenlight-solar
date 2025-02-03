import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  console.log("[API] Received request to send email.");

  if (req.method !== 'POST') {
    console.error("[ERROR] Invalid request method:", req.method);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { userEmail, subject, message } = req.body;
    console.log(`[INFO] Email Data Received:`, { userEmail, subject });

    // if (!userEmail || !subject || !message) {
    //   console.error("[ERROR] Missing required fields:", { userEmail, subject, message });
    //   return res.status(400).json({ error: "Missing required fields (userEmail, subject, message)." });
    // }

    // Configure Nodemailer SMTP Transport
    console.log("[INFO] Configuring SMTP Transport...");
    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: "billing@greenlightenergy.bm",  // Your Microsoft Email
        pass: "GreenLight18!",  // App Password
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });

    console.log("[INFO] SMTP Transport configured successfully.");

    // Construct the email
    const mailOptions = {
      from: "billing@greenlightenergy.bm",
      to: userEmail, // Send email to the user received from frontend
      subject: "test",
      text: message, // Plain text version
      html: `<p>Hello</p>`, // HTML version
    };

    console.log(`[INFO] Sending email to: ${userEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log("[SUCCESS] Email sent:", info.messageId);

    res.status(200).json({ message: 'Email sent successfully!', messageId: info.messageId });
  } catch (error) {
    console.error("[ERROR] Failed to send email:", error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
