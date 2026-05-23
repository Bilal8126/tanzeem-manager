// Copy this file to config.js and fill in your real values
// config.js is in .gitignore and will never be committed

const CONFIG = {
  CLIENT_ID:  'YOUR_GOOGLE_CLIENT_ID',
  SHEET_ID:   'YOUR_GOOGLE_SHEET_ID',
  GEMINI_KEY: 'YOUR_GEMINI_API_KEY',
  SCOPES:     'https://www.googleapis.com/auth/spreadsheets.readonly',
  GEMINI_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  SESSIONS: [
    { label: '2025-26', sheet: 'Session (2025-26)', expenses: 'Expense List (25-26)', donations: 'Donation (25-26)' },
    { label: '2024-25', sheet: 'Session (2024-25)', expenses: 'Expenses',             donations: 'Donations'         },
  ]
};
