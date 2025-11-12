/**
 * Email template utilities for generating HTML emails
 */

interface CustomerStatusResult {
  customerId: string;
  customerName: string;
  status: 'success' | 'failure';
  energyData?: {
    production: number;
    consumption: number;
    feedIn: number;
    selfConsumption: number;
  };
  error?: {
    errorType: string;
    errorMessage: string;
  };
}

interface DailyReportData {
  date: string;
  tokenRefreshResults: {
    total: number;
    successful: number;
    failed: number;
    needsReauth: number;
  };
  customerResults: CustomerStatusResult[];
  summary: {
    total: number;
    success: number;
    failure: number;
  };
}

/**
 * Generate HTML email template for daily status report
 */
export function generateDailyReportHTML(data: DailyReportData): string {
  const { date, tokenRefreshResults, customerResults, summary } = data;

  const successCustomers = customerResults.filter(r => r.status === 'success');
  const failureCustomers = customerResults.filter(r => r.status === 'failure');

  const successRate = summary.total > 0
    ? ((summary.success / summary.total) * 100).toFixed(1)
    : '0';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 800px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.95;
        }
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .card .value {
          font-size: 36px;
          font-weight: bold;
          margin: 5px 0;
        }
        .card.success .value { color: #4CAF50; }
        .card.failure .value { color: #f44336; }
        .card.total .value { color: #2196F3; }
        .card .percentage {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
        .section {
          padding: 25px;
          border-bottom: 1px solid #e0e0e0;
        }
        .section:last-child {
          border-bottom: none;
        }
        .section h2 {
          margin: 0 0 15px 0;
          font-size: 20px;
          color: #333;
          border-left: 4px solid #4CAF50;
          padding-left: 12px;
        }
        .token-refresh-summary {
          background-color: #e3f2fd;
          border-left: 4px solid #2196F3;
          padding: 15px;
          border-radius: 4px;
          margin: 15px 0;
        }
        .token-refresh-summary h3 {
          margin: 0 0 10px 0;
          color: #1976D2;
          font-size: 16px;
        }
        .token-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 10px;
        }
        .token-stat {
          text-align: center;
          padding: 10px;
          background: white;
          border-radius: 4px;
        }
        .token-stat .label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .token-stat .value {
          font-size: 20px;
          font-weight: bold;
          color: #1976D2;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        table th {
          background-color: #f5f5f5;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #666;
          text-transform: uppercase;
          border-bottom: 2px solid #e0e0e0;
        }
        table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }
        table tr:hover {
          background-color: #fafafa;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-badge.success {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        .status-badge.failure {
          background-color: #ffebee;
          color: #c62828;
        }
        .energy-data {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        .energy-item {
          display: inline-block;
          margin-right: 15px;
        }
        .error-message {
          color: #d32f2f;
          font-size: 12px;
          margin-top: 5px;
          font-style: italic;
        }
        .footer {
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
          background-color: #f5f5f5;
        }
        .footer p {
          margin: 5px 0;
        }
        .alert {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
        .alert strong {
          color: #856404;
        }
        .no-data {
          text-align: center;
          padding: 40px;
          color: #999;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>📊 Daily API & Production Status Report</h1>
          <p>Report Date: ${new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
        </div>

        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="card total">
            <h3>Total Customers</h3>
            <div class="value">${summary.total}</div>
          </div>
          <div class="card success">
            <h3>Successful</h3>
            <div class="value">${summary.success}</div>
            <div class="percentage">${successRate}% success rate</div>
          </div>
          <div class="card failure">
            <h3>Failed</h3>
            <div class="value">${summary.failure}</div>
          </div>
        </div>

        <!-- Token Refresh Summary -->
        <div class="section">
          <h2>🔐 Token Refresh Summary</h2>
          <div class="token-refresh-summary">
            <h3>Enphase OAuth Token Refresh</h3>
            <div class="token-stats">
              <div class="token-stat">
                <div class="label">Total</div>
                <div class="value">${tokenRefreshResults.total}</div>
              </div>
              <div class="token-stat">
                <div class="label">Successful</div>
                <div class="value" style="color: #4CAF50;">${tokenRefreshResults.successful}</div>
              </div>
              <div class="token-stat">
                <div class="label">Failed</div>
                <div class="value" style="color: #f44336;">${tokenRefreshResults.failed}</div>
              </div>
              <div class="token-stat">
                <div class="label">Needs Reauth</div>
                <div class="value" style="color: #ff9800;">${tokenRefreshResults.needsReauth}</div>
              </div>
            </div>
          </div>
        </div>

        ${failureCustomers.length > 0 ? `
        <!-- Failed Customers -->
        <div class="section">
          <h2>⚠️ Failed Customers (Requires Attention)</h2>
          <div class="alert">
            <strong>Action Required:</strong> ${failureCustomers.length} customer${failureCustomers.length > 1 ? 's' : ''} failed to fetch energy data. Please review and take necessary action.
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Status</th>
                <th>Error Details</th>
              </tr>
            </thead>
            <tbody>
              ${failureCustomers.map(customer => `
                <tr>
                  <td><strong>${customer.customerName}</strong></td>
                  <td><span class="status-badge failure">Failed</span></td>
                  <td>
                    <div><strong>${customer.error?.errorType || 'Unknown Error'}</strong></div>
                    <div class="error-message">${customer.error?.errorMessage || 'No error message available'}</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Successful Customers -->
        <div class="section">
          <h2>✅ Successful Customers</h2>
          ${successCustomers.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Status</th>
                <th>Energy Data (kWh)</th>
              </tr>
            </thead>
            <tbody>
              ${successCustomers.map(customer => `
                <tr>
                  <td><strong>${customer.customerName}</strong></td>
                  <td><span class="status-badge success">Success</span></td>
                  <td>
                    <div class="energy-data">
                      <span class="energy-item">⚡ Production: <strong>${customer.energyData?.production.toFixed(2) || 0}</strong></span>
                      <span class="energy-item">🏠 Consumption: <strong>${customer.energyData?.consumption.toFixed(2) || 0}</strong></span>
                      <span class="energy-item">📤 Feed-In: <strong>${customer.energyData?.feedIn.toFixed(2) || 0}</strong></span>
                      <span class="energy-item">🔋 Self-Consumption: <strong>${customer.energyData?.selfConsumption.toFixed(2) || 0}</strong></span>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<div class="no-data">No successful customer data fetches</div>'}
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>Greenlight Energy</strong></p>
          <p>📧 billing@greenlightenergy.bm | ☎️ 1 (441) 705 3033</p>
          <p>This is an automated report from the daily cron job running at 12:00 AM</p>
          <p>&copy; ${new Date().getFullYear()} Greenlight Energy. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
