const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = 'c:\\Users\\Administrator\\Desktop\\SND\\frontend';

function replaceInFile(filePath, replacements) {
  const fullPath = path.join(FRONTEND_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  for (const { search, replace, all } of replacements) {
    if (all) {
      content = content.split(search).join(replace);
    } else {
      content = content.replace(search, replace);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No changes made to: ${filePath}`);
  }
}

// 11. src/pages/admin/Dashboard.jsx
replaceInFile('src/pages/admin/Dashboard.jsx', [
  { search: 'className="text-black"', replace: 'className="text-black dark:text-white"', all: true },
  { search: 'badge-blue', replace: 'badge-blue dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800', all: true },
  { search: 'badge-success', replace: 'badge-success dark:bg-green-950/50 dark:text-green-300 dark:border-green-800', all: true },
  { search: 'text-slate-500 mt-2', replace: 'text-slate-500 dark:text-slate-400 mt-2', all: false },
  { search: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200', replace: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-200 dark:border-red-800', all: true },
  { search: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200', replace: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 border-green-200 dark:border-green-800', all: true },
  { search: 'bg-blue-50 text-registryBlue hover:bg-blue-100 border-blue-200', replace: 'bg-blue-50 dark:bg-blue-950/40 text-registryBlue dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800', all: true }
]);

// 12. src/pages/citizen/Dashboard.jsx
replaceInFile('src/pages/citizen/Dashboard.jsx', [
  { search: 'text-black', replace: 'text-black dark:text-white', all: true },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'text-green-700', replace: 'text-green-700 dark:text-green-300', all: true },
  { search: 'border-slate-300', replace: 'border-slate-300 dark:border-slate-800', all: true },
  { search: 'hover:bg-slate-50 dark:bg-slate-950 hover:text-registryBlue', replace: 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300', all: true }
]);

// 13. src/pages/citizen/PendingApproval.jsx
replaceInFile('src/pages/citizen/PendingApproval.jsx', [
  { search: 'text-red-600', replace: 'text-red-600 dark:text-red-400', all: true }
]);

// 14. src/pages/notary/Dashboard.jsx
replaceInFile('src/pages/notary/Dashboard.jsx', [
  { search: 'text-black', replace: 'text-black dark:text-white', all: true },
  { search: 'bg-blue-50 text-registryBlue border border-blue-100', replace: 'bg-blue-50 dark:bg-blue-950/40 text-registryBlue dark:text-blue-400 border border-blue-100 dark:border-blue-800', all: true },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'btn-secondary text-red-600 border-red-200 hover:bg-red-50', replace: 'btn-secondary text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30', all: true },
  { search: 'text-registryBlue hover:bg-registryBlue hover:text-white border border-blue-100', replace: 'text-registryBlue dark:text-blue-400 hover:bg-registryBlue hover:text-white border border-blue-100 dark:border-blue-800 dark:hover:bg-blue-600', all: true },
  { search: 'text-slate-500">From:', replace: 'text-slate-500 dark:text-slate-400">From:', all: true }
]);

// 15. src/pages/officer/Dashboard.jsx
replaceInFile('src/pages/officer/Dashboard.jsx', [
  { search: 'text-black', replace: 'text-black dark:text-white', all: true },
  { search: 'bg-blue-50 text-registryBlue border-blue-100', replace: 'bg-blue-50 dark:bg-blue-950/40 text-registryBlue dark:text-blue-400 border-blue-100 dark:border-blue-800', all: true },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'btn-secondary text-red-600 border-red-200 hover:bg-red-50', replace: 'btn-secondary text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30', all: true },
  { search: 'bg-green-50 text-green-700 border-green-200', replace: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800', all: true },
  { search: 'bg-amber-50 text-amber-600 border-amber-200', replace: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800', all: true }
]);

// 16. src/pages/officer/PropertyControl.jsx
replaceInFile('src/pages/officer/PropertyControl.jsx', [
  { search: 'bg-green-50 text-green-700 border border-green-200', replace: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800', all: false },
  { search: 'bg-red-50 text-red-700 border border-red-200', replace: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800', all: false },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true }
]);

// 17. src/pages/AddProperty.jsx
replaceInFile('src/pages/AddProperty.jsx', [
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'hover:bg-white dark:bg-slate-900', replace: 'hover:bg-white dark:hover:bg-slate-800', all: true },
  { search: 'hover:bg-slate-50 dark:bg-slate-950', replace: 'hover:bg-slate-50 dark:hover:bg-slate-800', all: true }
]);

// 18. src/pages/AssetSearch.jsx
replaceInFile('src/pages/AssetSearch.jsx', [
  { search: 'badge-success', replace: 'badge-success dark:bg-green-950/40 dark:text-green-300', all: true },
  { search: 'badge-blue', replace: 'badge-blue dark:bg-blue-950/40 dark:text-blue-300', all: true },
  { search: 'badge-warning', replace: 'badge-warning dark:bg-amber-950/40 dark:text-amber-300', all: true },
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'border-slate-100', replace: 'border-slate-100 dark:border-slate-800', all: true },
  { search: 'border-slate-50', replace: 'border-slate-50 dark:border-slate-800', all: true }
]);

// 19. src/pages/Certificates.jsx
replaceInFile('src/pages/Certificates.jsx', [
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'border-slate-100', replace: 'border-slate-100 dark:border-slate-800', all: true }
]);

// 20. src/pages/History.jsx
replaceInFile('src/pages/History.jsx', [
  { search: 'text-registryBlue', replace: 'text-registryBlue dark:text-blue-400', all: true },
  { search: 'divide-slate-100', replace: 'divide-slate-100 dark:divide-slate-800', all: true },
  { search: 'hover:bg-slate-50 dark:bg-slate-950', replace: 'hover:bg-slate-50 dark:hover:bg-slate-800', all: true }
]);

console.log('Script execution finished.');
