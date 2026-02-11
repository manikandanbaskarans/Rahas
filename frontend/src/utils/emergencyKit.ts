/**
 * Emergency Kit PDF generation.
 * Uses basic PDF structure without jsPDF dependency — generates a printable HTML page
 * that the user can save as PDF via the browser's print dialog.
 */

export interface EmergencyKitData {
  email: string;
  name: string;
  signInUrl: string;
  kdfIterations: number;
  kdfMemory: number;
  createdAt: string;
}

/**
 * Generate and trigger download of the emergency kit.
 * Opens a new window with a printable page that can be saved as PDF.
 */
export function downloadEmergencyKit(data: EmergencyKitData): void {
  const html = generateEmergencyKitHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const newWindow = window.open(url, '_blank');
  if (newWindow) {
    newWindow.addEventListener('load', () => {
      newWindow.print();
    });
  }

  // Clean up after a delay
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function generateEmergencyKitHTML(data: EmergencyKitData): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VaultKeeper Emergency Kit</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 60px;
      max-width: 800px;
      margin: 0 auto;
      color: #1a1a1a;
    }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { color: #666; font-size: 14px; }
    .warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 32px;
      font-size: 14px;
    }
    .warning strong { color: #92400e; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 16px; margin-bottom: 12px; color: #374151; }
    .field {
      display: flex;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .field-label {
      background: #f9fafb;
      padding: 12px 16px;
      width: 180px;
      font-weight: 500;
      font-size: 13px;
      border-right: 1px solid #e5e7eb;
    }
    .field-value {
      padding: 12px 16px;
      flex: 1;
      font-size: 13px;
    }
    .field-value.password {
      border: 2px dashed #d1d5db;
      background: #fafafa;
      min-height: 44px;
      font-style: italic;
      color: #9ca3af;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    .instructions {
      background: #f0fdf4;
      border: 1px solid #22c55e;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 32px;
      font-size: 13px;
    }
    .instructions ol { padding-left: 20px; }
    .instructions li { margin-bottom: 6px; }
    @media print {
      body { padding: 40px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>VaultKeeper Emergency Kit</h1>
    <p>Generated on ${date}</p>
  </div>

  <div class="warning">
    <strong>IMPORTANT:</strong> This document contains sensitive account recovery information.
    Print it and store it in a secure location (safe, safety deposit box).
    Do NOT store this digitally or share it with anyone.
  </div>

  <div class="section">
    <h2>Account Information</h2>
    <div class="field">
      <div class="field-label">Sign-in URL</div>
      <div class="field-value">${escapeHtml(data.signInUrl)}</div>
    </div>
    <div class="field">
      <div class="field-label">Email</div>
      <div class="field-value">${escapeHtml(data.email)}</div>
    </div>
    <div class="field">
      <div class="field-label">Name</div>
      <div class="field-value">${escapeHtml(data.name)}</div>
    </div>
  </div>

  <div class="section">
    <h2>Master Password</h2>
    <div class="field">
      <div class="field-label">Master Password</div>
      <div class="field-value password">Write your master password here by hand</div>
    </div>
  </div>

  <div class="section">
    <h2>Key Derivation Parameters</h2>
    <div class="field">
      <div class="field-label">KDF Iterations</div>
      <div class="field-value">${data.kdfIterations}</div>
    </div>
    <div class="field">
      <div class="field-label">KDF Memory (KB)</div>
      <div class="field-value">${data.kdfMemory}</div>
    </div>
  </div>

  <div class="instructions">
    <strong>Recovery Instructions:</strong>
    <ol>
      <li>Go to the sign-in URL above</li>
      <li>Enter your email and master password</li>
      <li>If you have MFA enabled, you will need your authenticator device</li>
      <li>Your vault will be decrypted with your master password</li>
    </ol>
  </div>

  <div class="footer">
    <p>VaultKeeper Emergency Kit &mdash; Keep this document safe and secure</p>
    <p>Account created: ${escapeHtml(data.createdAt)}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
