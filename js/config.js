const CONFIG = {
  CLIENT_ID:   '627419494712-e7n7t9dp806aeheqhiroe5s8t6jmhf94.apps.googleusercontent.com',
  SHEET_ID:    '1UOJBM4_pnlZiO4oiENTr5vrO3F2CHCsrsefk-TzMpH4',
  GEMINI_KEY:  'AIzaSyBunIXwVyVGMBKF0xb3DTHYkmR80uGE6So',
  SCOPES:      'https://www.googleapis.com/auth/spreadsheets.readonly',
  //GEMINI_URL:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  GEMINI_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
   SESSIONS: [
    { label: '2025-26', sheet: 'Session (2025-26)', expenses: 'Expense List (25-26)', donations: 'Donation (25-26)' },
    { label: '2024-25', sheet: 'Session (2024-25)', expenses: 'Expenses',             donations: 'Donations'         },
  ]
};
