/**
 * Test script to manually send a daily status report email
 * Run this script to test the email functionality before deploying
 *
 * Usage: npx ts-node src/scripts/test-daily-email.ts
 */

import { EmailService } from '../services/email-service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDailyEmail() {
  console.log('🧪 Testing Daily Status Report Email...\n');

  const emailService = new EmailService();

  // Mock data for testing
  const mockReportData = {
    date: new Date().toISOString().split('T')[0],
    tokenRefreshResults: {
      total: 5,
      successful: 4,
      failed: 1,
      needsReauth: 1,
    },
    customerResults: [
      {
        customerId: '1',
        customerName: 'John Doe Solar System',
        status: 'success' as const,
        energyData: {
          production: 45.67,
          consumption: 32.45,
          feedIn: 15.22,
          selfConsumption: 30.45,
        },
      },
      {
        customerId: '2',
        customerName: 'Jane Smith Energy',
        status: 'success' as const,
        energyData: {
          production: 52.34,
          consumption: 28.90,
          feedIn: 24.44,
          selfConsumption: 27.90,
        },
      },
      {
        customerId: '3',
        customerName: 'Acme Corporation',
        status: 'failure' as const,
        error: {
          errorType: 'TOKEN_EXPIRED',
          errorMessage: 'Enphase authorization token has expired. Customer needs to reauthorize.',
        },
      },
      {
        customerId: '4',
        customerName: 'Green Energy Ltd',
        status: 'success' as const,
        energyData: {
          production: 38.92,
          consumption: 35.12,
          feedIn: 5.80,
          selfConsumption: 33.12,
        },
      },
      {
        customerId: '5',
        customerName: 'Solar Power Co',
        status: 'failure' as const,
        error: {
          errorType: 'API_ERROR',
          errorMessage: 'HTTP 503: Service temporarily unavailable',
        },
      },
    ],
    summary: {
      total: 5,
      success: 3,
      failure: 2,
    },
  };

  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  if (!adminEmail) {
    console.error('❌ Error: ADMIN_EMAIL or EMAIL_USER environment variable is not set');
    console.error('Please set ADMIN_EMAIL in your .env file');
    process.exit(1);
  }

  console.log(`📧 Sending test email to: ${adminEmail}\n`);
  console.log('📊 Report Summary:');
  console.log(`   - Total Customers: ${mockReportData.summary.total}`);
  console.log(`   - Successful: ${mockReportData.summary.success}`);
  console.log(`   - Failed: ${mockReportData.summary.failure}`);
  console.log(`   - Token Refreshes: ${mockReportData.tokenRefreshResults.successful}/${mockReportData.tokenRefreshResults.total}\n`);

  try {
    const result = await emailService.sendDailyStatusReport(adminEmail, mockReportData);

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`📨 Message ID: ${result.messageId}`);
      console.log('\n💡 Check your inbox at:', adminEmail);
    } else {
      console.error('❌ Failed to send email');
      console.error('Error:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the test
testDailyEmail()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
