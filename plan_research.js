const fs = require('fs');
const path = require('path');

function checkFile(filepath, queries) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    console.log(`\n--- ${path.basename(filepath)} ---`);
    queries.forEach(q => {
      const idx = content.indexOf(q);
      if (idx !== -1) {
        console.log(`Found "${q}" at offset ${idx}`);
        // Extract 300 chars around it
        const start = Math.max(0, idx - 150);
        const end = Math.min(content.length, idx + 150);
        console.log(content.substring(start, end));
      } else {
        console.log(`NOT FOUND: "${q}"`);
      }
    });
  } catch (e) {
    console.log(`Failed to read ${filepath}: ${e.message}`);
  }
}

// 8. Report verification code
checkFile('backend/services/certificateService.js', ['qrcode', 'verify']);
checkFile('frontend/src/pages/public/VerifyCertificate.jsx', ['/verify', 'api.']);

// 9. Audit Report Quality
checkFile('backend/services/reportService.js', ['SELECT', 'audit_logs']);
checkFile('backend/routes/adminRoutes.js', ['/audit']);

// 10. User Activity Report Date
checkFile('backend/services/reportService.js', ['activity', 'DATE']);

// 12. Admin Profile Settings
checkFile('frontend/src/components/layout/TopNavigation.jsx', ['Settings', 'dropdown']);
checkFile('frontend/src/pages/admin/Dashboard.jsx', ['Settings', 'settings']);
