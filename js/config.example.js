// Copy this file to config.js and fill in your real values
// config.js is in .gitignore and will never be committed

const CONFIG = {
  CLIENT_ID:  'YOUR_GOOGLE_CLIENT_ID',
  SHEET_ID:   'YOUR_GOOGLE_SHEET_ID',
  SCOPES:     'https://www.googleapis.com/auth/spreadsheets',
  WORKER_URL: 'https://tanzeem-proxy.YOUR_SUBDOMAIN.workers.dev',
  SESSIONS: [
    { label: '2025-26', sheet: 'Session (2025-26)', expenses: 'Expense List (25-26)', donations: 'Donation (25-26)' },
    { label: '2024-25', sheet: 'Session (2024-25)', expenses: 'Expenses',             donations: 'Donations'         },
  ]
};
